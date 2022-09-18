import { ValidationError, ValidationSchema } from 'fastest-validator';
import { LogConfigI } from './log/index.js';
export interface AppConfigI {
    log: LogConfigI;
    extended?: any;
}
export declare const appConfigSchema: ValidationSchema;
export declare function validateAppConfig(appConfig: AppConfigI): ValidationError[] | true | Promise<true | ValidationError[]>;
