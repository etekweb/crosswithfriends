import {create} from 'zustand';
import _ from 'lodash';
import {db, type DatabaseReference} from './firebase';
import {ref, onValue, off, get, set, push, remove} from 'firebase/database';
// eslint-disable-next-line import/no-cycle
import actions from '../actions';

import powerupData from '@crosswithfriends/shared/lib/powerups';
import GridObject from '@crosswithfriends/shared/lib/wrappers/GridWrapper';
// eslint-disable-next-line import/no-cycle
import {PuzzleModel} from './index';

const STARTING_POWERUPS = 1;
const NUM_PICKUPS = 10;
const MAX_ON_BOARD = 3;
const VALUE_LISTENERS = ['games', 'powerups', 'startedAt', 'players', 'winner', 'pickups'];

interface BattleInstance {
  path: string;
  ref: DatabaseReference;
  gids?: string[];
  listeners: {
    games?: (games: string[]) => void;
    powerups?: (powerups: any) => void;
    startedAt?: (startedAt: number) => void;
    players?: (players: any) => void;
    winner?: (winner: any) => void;
    pickups?: (pickups: any) => void;
    usePowerup?: (powerup: any) => void;
    ready?: () => void;
  };
  unsubscribes: Record<string, () => void>;
}

interface BattleStore {
  battles: Record<string, BattleInstance>;
  getBattle: (path: string) => BattleInstance;
  attach: (path: string) => void;
  detach: (path: string) => void;
  start: (path: string) => void;
  setSolved: (path: string, team: number) => void;
  addPlayer: (path: string, name: string, team: number) => void;
  removePlayer: (path: string, name: string, team: number) => void;
  usePowerup: (path: string, type: string, team: number) => void;
  checkPickups: (path: string, r: number, c: number, game: any, team: number) => void;
  countLivePickups: (path: string, cbk: (count: number) => void) => void;
  spawnPowerups: (path: string, n: number, games: any[], cbk?: () => void) => void;
  initialize: (path: string, pid: number, bid: number, teams?: number) => void;
  subscribe: (path: string, event: string, callback: (...args: any[]) => void) => () => void;
}

export const useBattleStore = create<BattleStore>((setState, getState) => {
  return {
    battles: {},

    getBattle: (path: string) => {
      const state = getState();
      if (!state.battles[path]) {
        const battleRef = ref(db, path);
        setState({
          battles: {
            ...state.battles,
            [path]: {
              path,
              ref: battleRef,
              listeners: {},
              unsubscribes: {},
            },
          },
        });
      }
      return getState().battles[path];
    },

    attach: (path: string) => {
      const state = getState();
      let battle = state.battles[path];
      if (!battle) {
        battle = state.getBattle(path);
      }

      const unsubscribes: Record<string, () => void> = {};

      VALUE_LISTENERS.forEach((subpath) => {
        const subRef = ref(db, `${path}/${subpath}`);
        const unsubscribe = onValue(subRef, (snapshot) => {
          const currentState = getState();
          const currentBattle = currentState.battles[path];
          if (currentBattle?.listeners[subpath as keyof typeof currentBattle.listeners]) {
            (currentBattle.listeners[subpath as keyof typeof currentBattle.listeners] as any)(snapshot.val());
          }
        });
        unsubscribes[subpath] = unsubscribe;
      });

      setState({
        battles: {
          ...state.battles,
          [path]: {
            ...battle,
            unsubscribes,
          },
        },
      });
    },

    detach: (path: string) => {
      const state = getState();
      const battle = state.battles[path];
      if (!battle) return;

      Object.values(battle.unsubscribes).forEach((unsubscribe) => unsubscribe());

      setState({
        battles: {
          ...state.battles,
          [path]: {
            ...battle,
            unsubscribes: {},
            listeners: {},
          },
        },
      });
    },

    subscribe: (path: string, event: string, callback: (...args: any[]) => void) => {
      const state = getState();
      const battle = state.battles[path];
      if (!battle) return () => {};

      const listeners = {
        ...battle.listeners,
        [event]: callback as any,
      };

      setState({
        battles: {
          ...state.battles,
          [path]: {
            ...battle,
            listeners,
          },
        },
      });

      // Return unsubscribe function
      return () => {
        const currentState = getState();
        const currentBattle = currentState.battles[path];
        if (!currentBattle) return;

        const newListeners = {...currentBattle.listeners};
        delete newListeners[event as keyof typeof newListeners];

        setState({
          battles: {
            ...currentState.battles,
            [path]: {
              ...currentBattle,
              listeners: newListeners,
            },
          },
        });
      };
    },

    start: (path: string) => {
      set(ref(db, `${path}/startedAt`), Date.now());
    },

    setSolved: (path: string, team: number) => {
      // Use transaction to atomically check and set winner
      runTransaction(ref(db, `${path}/winner`), (current) => {
        // If winner already exists, don't overwrite
        if (current) {
          return current;
        }
        // Atomically set winner
        return {
          team,
          completedAt: Date.now(),
        };
      });
    },

    addPlayer: (path: string, name: string, team: number) => {
      push(ref(db, `${path}/players`), {name, team});
    },

    removePlayer: (path: string, name: string, team: number) => {
      get(ref(db, `${path}/players`)).then((snapshot) => {
        const players = snapshot.val();
        const playerToRemove = _.findKey(players, {name, team});
        if (playerToRemove) {
          remove(ref(db, `${path}/players/${playerToRemove}`));
        }
      });
    },

    usePowerup: (path: string, type: string, team: number) => {
      get(ref(db, `${path}/powerups`)).then((snapshot) => {
        const allPowerups = snapshot.val();
        const ownPowerups = allPowerups[team];
        const toUse = _.find(ownPowerups, (powerup: any) => powerup.type === type && !powerup.used);
        if (toUse) {
          const state = getState();
          const battle = state.battles[path];
          if (battle?.listeners.usePowerup) {
            battle.listeners.usePowerup(toUse);
          }
          toUse.used = Date.now();
          toUse.target = 1 - team; // For now use on other team.
          set(ref(db, `${path}/powerups`), allPowerups);
        }
      });
    },

    checkPickups: (path: string, r: number, c: number, game: any, team: number) => {
      const {grid, solution} = game;
      const gridObj = new GridObject(grid);

      // Use transactions to atomically update both pickups and powerups
      // First, get the current state to determine what needs to be updated
      Promise.all([get(ref(db, `${path}/pickups`)), get(ref(db, `${path}/powerups`))]).then(
        ([pickupsSnapshot, powerupsSnapshot]) => {
          const pickups = pickupsSnapshot.val() || {};
          const powerups = powerupsSnapshot.val() || {[team]: []};

          const {across, down} = gridObj.getCrossingWords(r, c);
          const cellsToCheck = [...across, ...down];

          // Determine which pickups should be collected
          const pickupsToMark: string[] = [];
          const powerupsToAdd: any[] = [];

          cellsToCheck.forEach(({i, j}: {i: number; j: number}) => {
            if (grid[i][j].value !== solution[i][j]) return;

            _.forEach(pickups, (pickup: any, key: string) => {
              if (pickup.pickedUp) return;
              if (pickup.i === i && pickup.j === j) {
                pickupsToMark.push(key);
                powerupsToAdd.push({type: pickup.type});
              }
            });
          });

          // If no pickups to collect, return early
          if (pickupsToMark.length === 0) return;

          // Atomically update pickups
          runTransaction(ref(db, `${path}/pickups`), (currentPickups) => {
            const updated = {...(currentPickups || {})};
            pickupsToMark.forEach((key) => {
              if (updated[key] && !updated[key].pickedUp) {
                updated[key] = {...updated[key], pickedUp: true};
              }
            });
            return updated;
          });

          // Atomically update powerups
          runTransaction(ref(db, `${path}/powerups`), (currentPowerups) => {
            const updated = {...(currentPowerups || {})};
            if (!updated[team]) {
              updated[team] = [];
            }
            // Only add powerups that weren't already added
            powerupsToAdd.forEach((powerup) => {
              updated[team] = [...updated[team], powerup];
            });
            return updated;
          });
        }
      );
    },

    countLivePickups: (path: string, cbk: (count: number) => void) => {
      get(ref(db, `${path}/pickups`)).then((snapshot) => {
        const pickups = snapshot.val();
        const live = _.filter(pickups, (p: any) => !p.pickedUp);
        cbk(live.length);
      });
    },

    spawnPowerups: (path: string, n: number, games: any[], cbk?: () => void) => {
      const possibleLocationsPerGrid = _.map(games, (game) => {
        const {grid, solution} = game;
        const gridObj = new GridObject(grid);
        return gridObj.getPossiblePickupLocations(solution);
      });

      const state = getState();
      state.countLivePickups(path, (currentNum) => {
        if (currentNum > MAX_ON_BOARD) return;
        const possibleLocations = _.intersectionWith(...possibleLocationsPerGrid, _.isEqual);

        const locations = _.sampleSize(possibleLocations, n);

        const powerupTypes = _.keys(powerupData);
        const pickups = _.map(locations, ({i, j}: {i: number; j: number}) => ({
          i,
          j,
          type: _.sample(powerupTypes),
        }));

        Promise.all(
          pickups.map((pickup: any) => {
            return push(ref(db, `${path}/pickups`), pickup).then(() => {});
          })
        ).then(() => {
          if (cbk) cbk();
        });
      });
    },

    initialize: (path: string, pid: number, bid: number, teams: number = 2) => {
      const args = _.map(_.range(teams), (team) => ({
        pid,
        battleData: {bid, team},
      }));

      const powerupTypes = _.keys(powerupData);
      const powerups = _.map(_.range(teams), () =>
        _.map(_.sampleSize(powerupTypes, STARTING_POWERUPS), (type) => ({type}))
      );

      const puzzle = new PuzzleModel(`/puzzle/${pid}`);
      puzzle.attach();
      puzzle.once('ready', () => {
        const rawGame = puzzle.toGame();
        puzzle.detach();

        // Need to wait for all of these to finish otherwise the redirect on emit(ready) kills things.
        Promise.all(
          args.map((arg) => {
            return new Promise<string>((resolve) => {
              actions.createGameForBattle(arg, (gid: string) => {
                resolve(gid);
              });
            });
          })
        ).then((gids: string[]) => {
          const state = getState();
          const battle = state.battles[path];
          set(ref(db, `${path}/games`), gids).then(() => {
            set(ref(db, `${path}/powerups`), powerups).then(() => {
              const currentState = getState();
              currentState.spawnPowerups(path, NUM_PICKUPS, [rawGame], () => {
                const finalState = getState();
                const finalBattle = finalState.battles[path];
                if (finalBattle?.listeners.ready) {
                  finalBattle.listeners.ready();
                }
              });
            });
          });

          setState({
            battles: {
              ...state.battles,
              [path]: {
                ...battle!,
                gids,
              },
            },
          });
        });
      });
    },
  };
});
