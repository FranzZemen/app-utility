import Validator, {ValidationError, ValidationSchema} from 'fastest-validator';
import {isPromise} from 'node:util/types';
import {LogConfigI, logConfigSchema} from './log/index.js';

export interface AppConfigI {
  log: LogConfigI
  extended?: any;
}

export const appConfigSchema: ValidationSchema = {
  type: 'object',
  optional: true,
  props: {
    log: logConfigSchema,
  }
}

const check = (new Validator()).compile({app: appConfigSchema});

export function validateAppConfig(appConfig: AppConfigI): ValidationError[] | true | Promise<true | ValidationError[]> {
  return check(appConfig);
}

export function isAppConfigSync(config: any | AppConfigI): config is AppConfigI {
  return validateAppConfig(config) === true;
}

