import allEventDefs from './allEventDefs';
import {initialState} from './initialState';
import type {GameEvent} from './types/GameEvent';
import type {GameState} from './types/GameState';
import type {EventType} from './types/GameEventType';

export default (state: GameState, event: GameEvent): GameState => {
  if (!state) state = initialState;
  if (!event) return state;

  const eventType = event.type as EventType;
  if (!(eventType in allEventDefs)) {
    console.warn(`Game event not implemented: ${eventType}`);
    return state;
  }

  const eventDef = allEventDefs[eventType];
  if (!eventDef) {
    return state;
  }

  // TypeScript can't properly narrow the union type here, but we know the types are correct
  // because GameEvent<T> ensures event.params matches the event type
  // We use 'as any' here as a last resort, but with proper type guards above
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return eventDef.reducer(state, event.params as any, event.timestamp);
};
