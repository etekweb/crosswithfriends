import {create} from 'zustand';
import _ from 'lodash';
import io from 'socket.io-client';
import * as uuid from 'uuid';
import * as colors from '@crosswithfriends/shared/lib/colors';
import {emitAsync} from '../sockets/emitAsync';
import {getSocket} from '../sockets/getSocket';
import {db, SERVER_TIME, type DatabaseReference} from './firebase';
import {ref, onValue, off, get, set} from 'firebase/database';
import {isValidFirebasePath, extractAndValidateGid, createSafePath} from './firebaseUtils';

// ============ Serialize / Deserialize Helpers ========== //

// Recursively walks obj and converts `null` to `undefined`
const castNullsToUndefined = (obj: any): any => {
  if (_.isNil(obj)) {
    return undefined;
  }
  if (typeof obj === 'object') {
    return Object.assign(
      obj.constructor(),
      _.fromPairs(_.keys(obj).map((key) => [key, castNullsToUndefined(obj[key])]))
    );
  }
  return obj;
};

const CURRENT_VERSION = 1.0;

interface GameInstance {
  path: string;
  ref: DatabaseReference;
  eventsRef: DatabaseReference;
  createEvent: any;
  socket?: io.Socket;
  battleData?: any;
  listeners: {
    createEvent?: (event: any) => void;
    event?: (event: any) => void;
    wsCreateEvent?: (event: any) => void;
    wsEvent?: (event: any) => void;
    wsOptimisticEvent?: (event: any) => void;
    reconnect?: () => void;
    battleData?: (data: any) => void;
    archived?: () => void;
  };
  unsubscribeBattleData?: () => void;
}

interface GameStore {
  games: Record<string, GameInstance>;
  getGame: (path: string) => GameInstance;
  attach: (path: string) => Promise<void>;
  detach: (path: string) => void;
  updateCell: (
    path: string,
    r: number,
    c: number,
    id: string,
    color: string,
    pencil: boolean,
    value: string,
    autocheck: boolean
  ) => void;
  updateCursor: (path: string, r: number, c: number, id: string) => void;
  addPing: (path: string, r: number, c: number, id: string) => void;
  updateDisplayName: (path: string, id: string, displayName: string) => void;
  updateColor: (path: string, id: string, color: string) => void;
  updateClock: (path: string, action: string) => void;
  check: (path: string, scope: string) => void;
  reveal: (path: string, scope: string) => void;
  reset: (path: string, scope: string, force: boolean) => void;
  chat: (path: string, username: string, id: string, text: string) => void;
  initialize: (path: string, rawGame: any, options?: {battleData?: any}) => Promise<void>;
  subscribe: (path: string, event: string, callback: (...args: any[]) => void) => () => void;
  checkArchive: (path: string) => void;
  unarchive: (path: string) => void;
}

export const useGameStore = create<GameStore>((setState, getState) => {
  const connectToWebsocket = async (path: string): Promise<void> => {
    const state = getState();
    const game = state.games[path];
    if (!game || game.socket) return;

    const socket = await getSocket();
    const gid = path.substring(6); // Extract gid from path like "/game/39-vosk"

    // Register event handlers BEFORE async operations to avoid missing events
    // Following Socket.io best practice: register handlers outside connect event
    socket.on('disconnect', () => {
      // Socket disconnected - reconnection is handled automatically by Socket.io
    });

    // Handle reconnects - registered once, outside connect event to avoid duplicates
    socket.on('connect', async () => {
      await emitAsync(socket, 'join_game', gid);
      const currentState = getState();
      const currentGame = currentState.games[path];
      if (currentGame?.listeners.reconnect) {
        currentGame.listeners.reconnect();
      }
    });

    // Join game after handlers are registered
    await emitAsync(socket, 'join_game', gid);

    setState({
      games: {
        ...state.games,
        [path]: {
          ...game,
          socket,
        },
      },
    });
  };

  const subscribeToWebsocketEvents = async (path: string): Promise<void> => {
    const state = getState();
    const game = state.games[path];
    if (!game || !game.socket || !game.socket.connected) {
      throw new Error('Not connected to websocket');
    }

    game.socket.on('game_event', (event: any) => {
      const processedEvent = castNullsToUndefined(event);
      const currentState = getState();
      const currentGame = currentState.games[path];
      if (!currentGame) return;

      if (processedEvent.type === 'create') {
        if (currentGame.listeners.wsCreateEvent) {
          currentGame.listeners.wsCreateEvent(processedEvent);
        }
      } else {
        if (currentGame.listeners.wsEvent) {
          currentGame.listeners.wsEvent(processedEvent);
        }
      }
    });

    const response = await emitAsync(game.socket, 'sync_all_game_events', path.substring(6));
    response.forEach((event: any) => {
      const processedEvent = castNullsToUndefined(event);
      const currentState = getState();
      const currentGame = currentState.games[path];
      if (!currentGame) return;

      if (processedEvent.type === 'create') {
        if (currentGame.listeners.wsCreateEvent) {
          currentGame.listeners.wsCreateEvent(processedEvent);
        }
      } else {
        if (currentGame.listeners.wsEvent) {
          currentGame.listeners.wsEvent(processedEvent);
        }
      }
    });
  };

  const addEvent = async (path: string, event: any): Promise<void> => {
    event.id = uuid.v4();
    const state = getState();
    const game = state.games[path];
    if (!game) return;

    // Emit optimistic event
    if (game.listeners.wsOptimisticEvent) {
      game.listeners.wsOptimisticEvent(event);
    }

    await connectToWebsocket(path);
    await pushEventToWebsocket(path, event);
  };

  const pushEventToWebsocket = async (path: string, event: any): Promise<any> => {
    const state = getState();
    const game = state.games[path];
    if (!game || !game.socket) {
      throw new Error('Socket not initialized');
    }

    // If socket is disconnected, wait for reconnection
    // Socket.io automatically handles reconnection, we just need to wait
    if (!game.socket.connected) {
      // Wait for reconnection with a timeout
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          game.socket?.off('connect', onConnect);
          reject(new Error('Socket reconnection timeout'));
        }, 10000); // 10 second timeout

        const onConnect = () => {
          clearTimeout(timeout);
          game.socket?.off('connect', onConnect);
          resolve();
        };

        if (game.socket.connected) {
          clearTimeout(timeout);
          resolve();
        } else {
          game.socket.once('connect', onConnect);
        }
      });

      // Re-join the game room after reconnection
      const gid = path.substring(6);
      await emitAsync(game.socket, 'join_game', gid);
    }

    return emitAsync(game.socket, 'game_event', {
      event,
      gid: path.substring(6),
    });
  };

  return {
    games: {},

    getGame: (path: string) => {
      // Validate path following Firebase best practices
      if (!isValidFirebasePath(path)) {
        console.error('Invalid game path in getGame', path);
        throw new Error(`Invalid game path: ${path}`);
      }

      // Validate gid extraction
      const gid = extractAndValidateGid(path);
      if (!gid) {
        console.error('Invalid gid in game path', path);
        throw new Error(`Invalid gid in path: ${path}`);
      }

      const state = getState();
      if (!state.games[path]) {
        try {
          const gameRef = ref(db, path);
          const eventsRef = ref(db, `${path}/events`);
          (window as any).game = {path}; // For backward compatibility

          setState({
            games: {
              ...state.games,
              [path]: {
                path,
                ref: gameRef,
                eventsRef,
                createEvent: null,
                listeners: {},
              },
            },
          });
        } catch (error) {
          console.error('Error creating game refs', error);
          throw error;
        }
      }
      return getState().games[path];
    },

    attach: async (path: string) => {
      // Validate path following Firebase best practices
      if (!isValidFirebasePath(path)) {
        console.error('Invalid game path in attach', path);
        throw new Error(`Invalid game path: ${path}`);
      }

      // Validate gid extraction
      const gid = extractAndValidateGid(path);
      if (!gid) {
        console.error('Invalid gid in game path', path);
        throw new Error(`Invalid gid in path: ${path}`);
      }

      const state = getState();
      let game = state.games[path];
      if (!game) {
        try {
          // Create game instance if it doesn't exist
          const gameRef = ref(db, path);
          const eventsRef = ref(db, `${path}/events`);
          game = {
            path,
            ref: gameRef,
            eventsRef,
            createEvent: null,
            listeners: {},
          };
          setState({
            games: {
              ...state.games,
              [path]: game,
            },
          });
        } catch (error) {
          console.error('Error creating game instance', error);
          throw error;
        }
      }

      // Subscribe to battleData with error handling (Firebase best practice)
      const battleDataRef = ref(db, `${path}/battleData`);
      const unsubscribeBattleData = onValue(
        battleDataRef,
        (snapshot) => {
          const currentState = getState();
          const currentGame = currentState.games[path];
          if (!currentGame) return; // Game was detached

          if (currentGame.listeners.battleData) {
            currentGame.listeners.battleData(snapshot.val());
          }
          setState({
            games: {
              ...currentState.games,
              [path]: {
                ...currentGame,
                battleData: snapshot.val(),
              },
            },
          });
        },
        (error) => {
          // Error callback following Firebase best practices
          console.error('Error reading battleData', error);
        }
      );

      setState({
        games: {
          ...state.games,
          [path]: {
            ...game,
            unsubscribeBattleData,
          },
        },
      });

      await connectToWebsocket(path);
      await subscribeToWebsocketEvents(path);
    },

    detach: (path: string) => {
      const state = getState();
      const game = state.games[path];
      if (!game) return;

      // Clean up subscriptions first
      if (game.unsubscribeBattleData) {
        game.unsubscribeBattleData();
      }
      if (game.eventsRef) {
        off(game.eventsRef);
      }

      // Clean up socket connection if it exists
      if (game.socket) {
        game.socket.off('game_event');
        game.socket.off('connect');
        game.socket.off('disconnect');
        // Don't disconnect the socket here as it might be shared
        // Just remove the event listeners
      }

      // Only update state if the game actually exists and will be removed
      // This prevents unnecessary state updates that could trigger re-renders
      if (state.games[path]) {
        const newGames = {...state.games};
        delete newGames[path];
        setState({
          games: newGames,
        });
      }
    },

    subscribe: (path: string, event: string, callback: (...args: any[]) => void) => {
      const state = getState();
      const game = state.games[path];
      if (!game) return () => {};

      // Update listeners immediately but use a shallow check to avoid unnecessary state updates
      // Only update state if the listener actually changed
      const existingListener = game.listeners[event as keyof typeof game.listeners];
      if (existingListener === callback) {
        // Listener already registered, return no-op unsubscribe
        return () => {};
      }

      const listeners = {
        ...game.listeners,
        [event]: callback as any,
      };

      // Batch state updates using requestAnimationFrame to prevent infinite loops
      // This defers the state update to the next frame, breaking synchronous update chains
      requestAnimationFrame(() => {
        const currentState = getState();
        const currentGame = currentState.games[path];
        if (!currentGame) return;

        // Only update if the listener hasn't changed (another subscription might have updated it)
        if (currentGame.listeners[event as keyof typeof currentGame.listeners] !== callback) {
          return;
        }

        setState({
          games: {
            ...currentState.games,
            [path]: {
              ...currentGame,
              listeners,
            },
          },
        });
      });

      // Return unsubscribe function
      return () => {
        const currentState = getState();
        const currentGame = currentState.games[path];
        if (!currentGame) return;

        // Only update if this listener is still registered
        if (currentGame.listeners[event as keyof typeof currentGame.listeners] !== callback) {
          return;
        }

        const newListeners = {...currentGame.listeners};
        delete newListeners[event as keyof typeof newListeners];

        setState({
          games: {
            ...currentState.games,
            [path]: {
              ...currentGame,
              listeners: newListeners,
            },
          },
        });
      };
    },

    updateCell: (
      path: string,
      r: number,
      c: number,
      id: string,
      color: string,
      pencil: boolean,
      value: string,
      autocheck: boolean
    ) => {
      addEvent(path, {
        timestamp: SERVER_TIME,
        type: 'updateCell',
        params: {
          cell: {r, c},
          value,
          color,
          pencil,
          id,
          autocheck,
        },
      });
    },

    updateCursor: (path: string, r: number, c: number, id: string) => {
      addEvent(path, {
        timestamp: SERVER_TIME,
        type: 'updateCursor',
        params: {
          timestamp: SERVER_TIME,
          cell: {r, c},
          id,
        },
      });
    },

    addPing: (path: string, r: number, c: number, id: string) => {
      addEvent(path, {
        timestamp: SERVER_TIME,
        type: 'addPing',
        params: {
          timestamp: SERVER_TIME,
          cell: {r, c},
          id,
        },
      });
    },

    updateDisplayName: (path: string, id: string, displayName: string) => {
      addEvent(path, {
        timestamp: SERVER_TIME,
        type: 'updateDisplayName',
        params: {
          id,
          displayName,
        },
      });
    },

    updateColor: (path: string, id: string, color: string) => {
      addEvent(path, {
        timestamp: SERVER_TIME,
        type: 'updateColor',
        params: {
          id,
          color,
        },
      });
    },

    updateClock: (path: string, action: string) => {
      addEvent(path, {
        timestamp: SERVER_TIME,
        type: 'updateClock',
        params: {
          action,
          timestamp: SERVER_TIME,
        },
      });
    },

    check: (path: string, scope: string) => {
      addEvent(path, {
        timestamp: SERVER_TIME,
        type: 'check',
        params: {
          scope,
        },
      });
    },

    reveal: (path: string, scope: string) => {
      addEvent(path, {
        timestamp: SERVER_TIME,
        type: 'reveal',
        params: {
          scope,
        },
      });
    },

    reset: (path: string, scope: string, force: boolean) => {
      addEvent(path, {
        timestamp: SERVER_TIME,
        type: 'reset',
        params: {
          scope,
          force,
        },
      });
    },

    chat: (path: string, username: string, id: string, text: string) => {
      addEvent(path, {
        timestamp: SERVER_TIME,
        type: 'chat',
        params: {
          text,
          senderId: id,
          sender: username,
        },
      });
      addEvent(path, {
        timestamp: SERVER_TIME,
        type: 'sendChatMessage', // send to fencing too
        params: {
          message: text,
          id,
          sender: username,
        },
      });
    },

    initialize: async (path: string, rawGame: any, {battleData}: {battleData?: any} = {}) => {
      const {
        info = {},
        grid = [[{}]],
        solution = [['']],
        circles = [],
        chat = {messages: []},
        cursor = {},
        clues = {},
        clock = {
          lastUpdated: 0,
          totalTime: 0,
          paused: true,
        },
        solved = false,
        themeColor = colors.MAIN_BLUE_3,
        pid,
      } = rawGame;

      const game = {
        info,
        grid,
        solution,
        circles,
        chat,
        cursor,
        clues,
        clock,
        solved,
        themeColor,
      };
      const version = CURRENT_VERSION;

      const state = getState();
      const gameInstance = state.games[path] || state.getGame(path);

      await set(ref(db, `${path}/pid`), pid);
      await set(gameInstance.eventsRef, {});
      await addEvent(path, {
        timestamp: SERVER_TIME,
        type: 'create',
        params: {
          pid,
          version,
          game,
        },
      });

      if (battleData) {
        await set(ref(db, `${path}/battleData`), battleData);
      }
    },

    checkArchive: (path: string) => {
      get(ref(db, `${path}/archivedEvents`)).then((snapshot) => {
        const archiveInfo = snapshot.val();
        if (!archiveInfo) {
          return;
        }
        const {unarchivedAt} = archiveInfo;
        if (!unarchivedAt) {
          if (window.confirm('Unarchive game?')) {
            const state = getState();
            state.unarchive(path);
          }
        }
      });
    },

    unarchive: async (path: string) => {
      const snapshot = await get(ref(db, `${path}/archivedEvents`));
      const archiveInfo = snapshot.val();
      if (!archiveInfo) {
        return;
      }
      const {url} = archiveInfo;
      if (url) {
        const events = await (await fetch(url)).json();
        await set(ref(db, `${path}/archivedEvents/unarchivedAt`), SERVER_TIME);
        await set(ref(db, `${path}/events`), events);
      }
    },
  };
});
