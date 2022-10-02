import {AsyncCheckFunction, SyncCheckFunction} from 'fastest-validator';
import {LoadSchema} from './load-from-module.js';

export function isLoadSchema(schema: any | LoadSchema): schema is LoadSchema {
  return schema !== undefined && typeof schema === 'object' && 'useNewCheckerFunction' in schema && 'validationSchema' in schema;
}

export type CheckFunction = AsyncCheckFunction | SyncCheckFunction;

export function isCheckFunction(check: any | CheckFunction): check is CheckFunction {
  return check !== undefined && 'async' in check;
}

export function isAsyncCheckFunction(check: any | CheckFunction): check is AsyncCheckFunction {
  return check !== undefined && check.async === true;
}

export function isSyncCheckFunction(check: any | CheckFunction): check is SyncCheckFunction {
  return check !== undefined && check.async === false;
}


