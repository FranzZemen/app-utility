import {ExecutionContextI} from './execution-context.js';
import {LoggerAdapter} from './log/index.js';

export function logErrorAndThrow(err: Error | string, log?: LoggerAdapter, ec?: ExecutionContextI) {
  if(typeof err === 'string') {
    const error = new EnhancedError(err);
    error.isLogged = true;
    if(log) {
      log.error(error);
    } else {
      const log = new LoggerAdapter(ec, 're-common', 'enhanced-error', 'logErrorAndThrow');
      log.warn('No logger provided, using default');
      log.error(error);
    }
    throw error;
  } else {
    if (err instanceof EnhancedError) {
      if (err.isLogged) {
        throw err;
      } else {
        err.isLogged = true;
        if (log) {
          log.error(err);
        } else {
          const log = new LoggerAdapter(ec, 're-common', 'enhanced-error', 'logErrorAndThrow');
          log.warn('No logger provided, using default');
          log.error(err);
        }
        throw err;
      }
    } else {
      if (log) {
        log.error(err);
      } else {
        const log = new LoggerAdapter(ec, 're-common', 'enhanced-error', 'logErrorAndThrow');
        log.warn('No logger provided, using default');
        log.error(err);
      }
      throw new EnhancedError('Wrapped', err, true);
    }
  }
}

/**
 * Useful for handling Promise errors ( throw logErrorAndReturn(err, log, ec);
 * @param err
 * @param log
 * @param ec
 */
export function logErrorAndReturn(err: Error | string, log?: LoggerAdapter, ec?: ExecutionContextI) {
  if(typeof err === 'string') {
    const error = new EnhancedError(err);
    error.isLogged = true;
    if(log) {
      log.error(error);
    } else {
      const log = new LoggerAdapter(ec, 're-common', 'enhanced-error', 'logErrorAndThrow');
      log.warn('No logger provided, using default');
      log.error(error);
    }
    return error;
  }
  if(err instanceof EnhancedError) {
    if(err.isLogged) {
      return err;
    } else {
      err.isLogged = true;
      if(log) {
        log.error(err);
      } else {
        const log = new LoggerAdapter(ec, 're-common', 'enhanced-error', 'logErrorAndThrow');
        log.warn('No logger provided, using default');
        log.error(err);
      }
      return err;
    }
  } else {
    if(log) {
      log.error(err);
    } else {
      const log = new LoggerAdapter(ec, 're-common', 'enhanced-error', 'logErrorAndThrow');
      log.warn('No logger provided, using default');
      log.error(err);
    }
    return new EnhancedError('Wrapped', err, true);
  }
}

export class EnhancedError extends Error {
  isOriginalError = true;

  /**
   * @param message If it wraps an error, message is ignored in favor of the wrapped error message
   * @param err
   * @param isLogged
   */
  constructor(message?: string, protected err: Error = undefined, public isLogged = false) {
    super(err ? err.message : message);
    if(err) {
      this.isOriginalError = false;
    }
  }


  toString(): string {
    if(this.err) {
      return this.err.toString();
    } else {
      return super.toString();
    }
  }

  toLocaleString(): string {
    if(this.err) {
      return this.err.toLocaleString();
    } else {
      return super.toLocaleString();
    }
  }

  valueOf(): Object {
    if(this.err) {
      return this.err.valueOf();
    } else {
      return super.valueOf();
    }
  }

  hasOwnProperty(v: PropertyKey): boolean {
    if(this.err) {
      return this.err.hasOwnProperty(v);
    } else {
      return super.hasOwnProperty(v);
    }
  }

  isPrototypeOf(v: Object): boolean {
    if(this.err) {
      return this.err.isPrototypeOf(v);
    } else {
      return super.isPrototypeOf(v);
    }
  }

  propertyIsEnumerable(v: PropertyKey): boolean {
    if(this.err) {
      return this.err.propertyIsEnumerable(v);
    } else {
      return super.propertyIsEnumerable(v);
    }
  }
}
