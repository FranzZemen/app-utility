import { AsyncCheckFunction, SyncCheckFunction } from 'fastest-validator';
import { LoadSchema } from './load-from-module.js';
export declare function isLoadSchema(schema: any | LoadSchema): schema is LoadSchema;
export declare type CheckFunction = AsyncCheckFunction | SyncCheckFunction;
export declare function isCheckFunction(check: any | CheckFunction): check is CheckFunction;
export declare function isAsyncCheckFunction(check: any | CheckFunction): check is AsyncCheckFunction;
export declare function isSyncCheckFunction(check: any | CheckFunction): check is SyncCheckFunction;
