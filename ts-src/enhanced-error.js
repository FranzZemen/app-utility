import { LoggerAdapter } from './log/index.js';
export function logErrorAndThrow(err, log, ec) {
    if (err instanceof EnhancedError) {
        if (err.isLogged) {
            throw err;
        }
        else {
            err.isLogged = true;
            if (log) {
                log.error(err);
            }
            else {
                const log = new LoggerAdapter(ec, 're-common', 'enhanced-error', 'logErrorAndThrow');
                log.warn('No logger provided, using default');
                log.error(err);
            }
            throw err;
        }
    }
    else {
        if (log) {
            log.error(err);
        }
        else {
            const log = new LoggerAdapter(ec, 're-common', 'enhanced-error', 'logErrorAndThrow');
            log.warn('No logger provided, using default');
            log.error(err);
        }
        throw new EnhancedError('Wrapped', err, true);
    }
}
export function logErrorAndReturn(err, log, ec) {
    if (err instanceof EnhancedError) {
        if (err.isLogged) {
            return err;
        }
        else {
            err.isLogged = true;
            if (log) {
                log.error(err);
            }
            else {
                const log = new LoggerAdapter(ec, 're-common', 'enhanced-error', 'logErrorAndThrow');
                log.warn('No logger provided, using default');
                log.error(err);
            }
            return err;
        }
    }
    else {
        if (log) {
            log.error(err);
        }
        else {
            const log = new LoggerAdapter(ec, 're-common', 'enhanced-error', 'logErrorAndThrow');
            log.warn('No logger provided, using default');
            log.error(err);
        }
        return new EnhancedError('Wrapped', err, true);
    }
}
export class EnhancedError extends Error {
    constructor(message, err = undefined, isLogged = false) {
        super(err ? err.message : message);
        this.err = err;
        this.isLogged = isLogged;
        this.isOriginalError = true;
        if (err) {
            this.isOriginalError = false;
        }
    }
    toString() {
        if (this.err) {
            return this.err.toString();
        }
        else {
            return super.toString();
        }
    }
    toLocaleString() {
        if (this.err) {
            return this.err.toLocaleString();
        }
        else {
            return super.toLocaleString();
        }
    }
    valueOf() {
        if (this.err) {
            return this.err.valueOf();
        }
        else {
            return super.valueOf();
        }
    }
    hasOwnProperty(v) {
        if (this.err) {
            return this.err.hasOwnProperty(v);
        }
        else {
            return super.hasOwnProperty(v);
        }
    }
    isPrototypeOf(v) {
        if (this.err) {
            return this.err.isPrototypeOf(v);
        }
        else {
            return super.isPrototypeOf(v);
        }
    }
    propertyIsEnumerable(v) {
        if (this.err) {
            return this.err.propertyIsEnumerable(v);
        }
        else {
            return super.propertyIsEnumerable(v);
        }
    }
}
//# sourceMappingURL=enhanced-error.js.map