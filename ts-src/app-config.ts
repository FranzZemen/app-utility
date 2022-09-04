import Validator, {ValidationError} from 'fastest-validator';
import {LogConfigI, logConfigSchema} from './log/index.js';

export interface AppConfigI {
  log: LogConfigI
  extended?: any;
}

export const appConfigSchema = {
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

