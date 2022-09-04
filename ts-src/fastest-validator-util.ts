import {AsyncCheckFunction, SyncCheckFunction, ValidationSchema} from 'fastest-validator';

// Assumes schema is a Validation Schema or a Check Function!
export function isValidationSchema(schema: any | ValidationSchema): schema is ValidationSchema {
  return !('async' in schema);
}

export type CheckFunction = AsyncCheckFunction | SyncCheckFunction;

export function isCheckFunction(check: any | CheckFunction): check is CheckFunction {
  return 'async' in check;
}

export function isAsyncCheckFunction(check: any | CheckFunction): check is AsyncCheckFunction {
  return check.async === true;
}

export function isSyncCheckFunction(check: any | CheckFunction): check is SyncCheckFunction {
  return check.sync === false;
}


