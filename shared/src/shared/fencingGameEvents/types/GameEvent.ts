import allEventDefs from '../allEventDefs';
import type {EventType} from './GameEventType';
import type {ExtractParamsType} from './ExtractParamsType';

export type GameEvent<T extends EventType = EventType> = {
  type: T;
  params: ExtractParamsType<(typeof allEventDefs)[T]>;
  timestamp?: number;
};
