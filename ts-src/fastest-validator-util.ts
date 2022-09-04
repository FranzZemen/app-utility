import {AsyncCheckFunction, SyncCheckFunction} from 'fastest-validator';
import {LoadSchema} from './load-from-module.js';

// Assumes schema is a Validation Schema or a Check Function!
export function isLoadSchema(schema: any | LoadSchema): schema is LoadSchema {
  return schema !== undefined && 'useNewCheckerFunction' in schema && 'validationSchema' in schema;
}

export type CheckFunction = AsyncCheckFunction | SyncCheckFunction;

export function isCheckFunction(check: any | CheckFunction): check is CheckFunction {
  return 'async' in check;
}

export function isAsyncCheckFunction(check: any | CheckFunction): check is AsyncCheckFunction {
  return check.async === true;
}

export function isSyncCheckFunction(check: any | CheckFunction): check is SyncCheckFunction {
  return check.async === false;
}


