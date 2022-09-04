import { AsyncCheckFunction, SyncCheckFunction, ValidationSchema } from 'fastest-validator';
export declare function isValidationSchema(schema: any | ValidationSchema): schema is ValidationSchema;
export declare type CheckFunction = AsyncCheckFunction | SyncCheckFunction;
export declare function isCheckFunction(check: any | CheckFunction): check is CheckFunction;
export declare function isAsyncCheckFunction(check: any | CheckFunction): check is AsyncCheckFunction;
export declare function isSyncCheckFunction(check: any | CheckFunction): check is SyncCheckFunction;
