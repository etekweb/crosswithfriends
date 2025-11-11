/* eslint @typescript-eslint/no-unused-vars : "warn" */
import type {GameEvent} from '@crosswithfriends/shared/fencingGameEvents/types/GameEvent';
import type {GameState} from '@crosswithfriends/shared/fencingGameEvents/types/GameState';

export type ToolbarActions = {
  revealCell(): void;
};

export type DispatchFn = {
  // TODO move to useEventDispatchFn
  (gameEvent: GameEvent): Promise<void>;
};
// translate <Player/> callbacks to game events emitted
// TODO: copy paste logic from src/components/Game.js
export const useToolbarActions = (
  dispatch: DispatchFn,
  gameState: GameState,
  id: string
): ToolbarActions => ({
  revealCell() {
    dispatch({
      type: 'reveal',
      params: {
        scope: [gameState.users[id].cursor!],
        id,
      },
    });
  },
});
