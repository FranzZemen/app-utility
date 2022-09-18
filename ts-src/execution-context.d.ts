import { ValidationError } from 'fastest-validator';
import { AppConfigI } from './app-config.js';
export interface ExecutionContextI {
    appContext?: string;
    thread?: string;
    requestId?: string;
    authorization?: string;
    localContext?: string;
    throwOnAsync?: boolean;
    config?: AppConfigI;
}
export declare const executionContextSchema: {
    type: string;
    optional: boolean;
    props: {
        appContext: {
            type: string;
            optional: boolean;
        };
        thread: {
            type: string;
            optional: boolean;
        };
        requestId: {
            type: string;
            optional: boolean;
        };
        authorization: {
            type: string;
            optional: boolean;
        };
        config: import("fastest-validator").ValidationSchema<any>;
    };
};
export declare function validateExecutionContext(execContext: ExecutionContextI): ValidationError[] | true | Promise<true | ValidationError[]>;
