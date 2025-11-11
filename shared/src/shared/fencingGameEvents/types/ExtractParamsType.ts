import type {EventDef} from './EventDef';

export type ExtractParamsType<T> = T extends EventDef<infer R> ? R : unknown;
