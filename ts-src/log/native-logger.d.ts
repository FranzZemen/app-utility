import { LoggerI } from './logger-adapter.js';
export declare class NativeLogger implements LoggerI {
    error(err: any, stacktrace?: any, color?: string): void;
    warn(data: any, message?: string, color?: string): void;
    info(data: any, message?: string, color?: string): void;
    debug(data: any, message?: string, color?: string): void;
    trace(data: any, message?: string, color?: string): void;
}
