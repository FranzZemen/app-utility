import { ExecutionContextI } from './execution-context.js';
import { LoggerAdapter } from './log/index.js';
export declare function logErrorAndThrow(err: Error, log?: LoggerAdapter, ec?: ExecutionContextI): void;
export declare function logErrorAndReturn(err: Error, log?: LoggerAdapter, ec?: ExecutionContextI): EnhancedError;
export declare class EnhancedError extends Error {
    protected err: Error;
    isLogged: boolean;
    isOriginalError: boolean;
    constructor(message?: string, err?: Error, isLogged?: boolean);
    toString(): string;
    toLocaleString(): string;
    valueOf(): Object;
    hasOwnProperty(v: PropertyKey): boolean;
    isPrototypeOf(v: Object): boolean;
    propertyIsEnumerable(v: PropertyKey): boolean;
}
