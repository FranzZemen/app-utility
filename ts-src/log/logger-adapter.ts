import {inspect} from 'util';
import {ExecutionContextI} from '../execution-context';
import {loadFromModule} from '../load-from-module';
import {FgCyan, FgGreen, FgMagenta, FgRed, FgYellow, Reset} from './color-constants';
import {NativeLogger} from './native-logger';
const moment = require('moment');


/**
 * LoggerI - any object that provides the following interface
 */
export interface LoggerI {
  error(err, ...params);
  warn(data, message?: string, ...params);
  info(data, message?: string, ...params);
  debug(data, message?: string, ...params);
  trace(data, message?: string, ...params);
}


export class LoggerAdapter implements LoggerI {
  static lvl_none = 'none';
  static lvl_error = 'error';
  static lvl_warn = 'warn';
  static lvl_info = 'info';
  static lvl_debug = 'debug';
  static lvl_trace = 'trace';

  static _noLogging = 0;
  static _error = 1;
  static _warn = 2;
  static _info = 3;
  static _debug = 4;
  static _trace = 5;
  static _none = 6;

  static levels = [LoggerAdapter.lvl_none, LoggerAdapter.lvl_error, LoggerAdapter.lvl_warn, LoggerAdapter.lvl_info, LoggerAdapter.lvl_debug, LoggerAdapter.lvl_trace];

  level = LoggerAdapter.levels.indexOf(LoggerAdapter.lvl_info);

  private timingContext = '';
  private start: number = undefined;
  private interim: number = undefined;

  private showHidden = false;
  private depth = 5;

  private attributesAsString: string;

  private momentFormat = 'YYYY-MM-DD[T]HH:mm:ss.SSS';

  private logger: LoggerI;

  constructor(private execContext?: ExecutionContextI, public repo = '', public sourceFile = '',  public _method = '') {
    if (this.execContext && this.execContext.config && this.execContext.config.log && this.execContext.config.log.level) {
      this.level = LoggerAdapter.levels.indexOf(this.execContext.config.log.level);
      if (this.execContext.config.log.showHidden) {
        this.showHidden = this.execContext.config.log.showHidden;
      }
      if (this.execContext.config.log.depth) {
        this.depth = this.execContext.config.log.depth;
      }
    }
    this.initializeOverrides();

    this.attributesAsString = ''
      + (this.execContext?.config?.log?.logAttributes?.hideAppContext ? '' : '; appContext: ' + this.execContext?.appContext)
      + (this.execContext?.config?.log?.logAttributes?.hideRepo ? '' : '; repo: ' + this.repo)
      + (this.execContext?.config?.log?.logAttributes?.hideSourceFile ? '' : '; sourceFile: ' + this.sourceFile)
      + (this.execContext?.config?.log?.logAttributes?.hideMethod ? '' : '; method: ' + this._method)
      + (this.execContext?.config?.log?.logAttributes?.hideThread ? '' : '; thread: ' + this.execContext?.thread)
      + (this.execContext?.config?.log?.logAttributes?.hideRequestId ? '' : '; requestId: ' + this.execContext?.requestId)
      + (this.execContext?.config?.log?.logAttributes?.hideLevel ? '' : '; logLevel: ' + LoggerAdapter.levels[this.level]);

    const module = this.execContext?.config?.log?.loggerModule;
    if(module && module.moduleName && (module.constructorName || module.functionName)) {
      this.logger = loadFromModule<LoggerI>(module);
    } else {
      this.logger = new NativeLogger();
    }
  }

  setMethod(_method: string): LoggerAdapter {
    this._method = _method;
    return this;
  }

  error(err, stacktrace?: any, color: string = FgRed) {
    this.logger.error(err, stacktrace, color)
  }

  warn(data, message?: string, color: string = FgYellow) {
    if (this.warnAllowed()) {
      this.log(this.logger.warn, data, message, color, 'WARN:');
    }
  }

  info(data, message?: string, color: string = FgGreen) {
    if (this.infoAllowed()) {
      this.log(this.logger.info, data, message, color, 'INFO:');
    }
  }

  debug(data, message?: string, color: string = FgCyan) {
    if (this.debugAllowed()) {
      this.log(this.logger.debug, data, message, color, 'DEBUG:');
    }
  }

  trace(data, message?: string, color: string = FgMagenta) {
    if (this.traceAllowed()) {
      this.log(this.logger.debug, data, message, color, 'TRACE:');
    }
  }

  log(logMethod: (color: string, logMessage: string) => void, data: any, message: string, color: string, cwcPrefix: string) {
    // TODO modify to support cloud watch format
    if (data && (typeof data === 'string')) {
      const str = `${moment.utc().format(this.momentFormat)} ${cwcPrefix} ${(message ? message + ' ' + data + this.attributesAsString : data + this.attributesAsString)}`;
      logMethod(color + str + Reset,'');
    } else if(this.execContext?.config?.log?.flatten) {
      const str = `${moment.utc().format(this.momentFormat)} ${cwcPrefix} ${(message ? message + ' ' + this.attributesAsString : this.attributesAsString)}` + '\r\n' + inspect(this.getLogObject(data), this.showHidden, this.depth);
      logMethod(color + str + Reset,'');
    } else {
      const str = `${moment.utc().format(this.momentFormat)} ${cwcPrefix}` + '\r\n' + inspect(this.getLogObject(data, message), this.showHidden, this.depth);
      logMethod(color + str + Reset,'');
    }

  }

  startTiming(context) {
    if (this.start) {
      this.stopTiming();
    }
    this.start = Date.now();
    this.interim = this.start;
    this.timingContext = context;
    this.trace({timing: context, start: this.start}, 'Start Timing');
  }

  interimTiming(interimContext) {
    if (this.start) {
      const now = Date.now();
      this.trace({
        timing: this.timingContext,
        subTiming: interimContext,
        elapsed: (now - this.start),
        interim: (now - this.interim)
      }, 'interimTiming');
      this.interim = now;
    }
  }

  stopTiming() {
    if (this.start) {
      const now = Date.now();
      this.trace({timing: this.timingContext, elapsed: (now - this.start)}, 'stopTiming');
      this.start = undefined;
      this.interim = undefined;
      this.timingContext = '';
    }
  }

  private initializeOverrides() {
    if (this.execContext && this.execContext.config && this.execContext.config.log && this.execContext.config.log.overrides) {
      const override = this.execContext.config.log.overrides.find(override => override.repo === this.repo);
      if (override) {
        if (!override.source && !override.method) {
          // Override on repo
          this.level = LoggerAdapter.levels.indexOf(override.level);
          if (override.showHidden) {
            this.showHidden = override.showHidden;
          }
          if (override.depth) {
            this.depth = override.depth;
          }
        } else if (!override.method) {
          // Override on source
          const matchesSourceFile = override.source ? override.source === this.sourceFile : true;
          if (matchesSourceFile) {
            this.level = LoggerAdapter.levels.indexOf(override.level);
            if (override.showHidden) {
              this.showHidden = override.showHidden;
            }
            if (override.depth) {
              this.depth = override.depth;
            }
          }
        } else {
          const matchesSourceFile = override.source ? override.source === this.sourceFile : true;
          const matchesMethod = override && override.method ? override.method === this._method : true;
          if (matchesSourceFile && matchesMethod) {
            this.level = LoggerAdapter.levels.indexOf(override.level);
            if (override.showHidden) {
              this.showHidden = override.showHidden;
            }
            if (override.depth) {
              this.depth = override.depth;
            }
          }
        }
      }
    }
  }

  private getLogObject(data, message?: string): any {
    let logObject = {};
    if(message) {
      logObject['message']= message;
    }
    if(!this.execContext?.config?.log?.logAttributes?.hideAppContext && !this.execContext?.config?.log?.flatten) {
      logObject['appContext'] = this.execContext?.appContext;
    }
    if(!this.execContext?.config?.log?.logAttributes?.hideRepo && !this.execContext?.config?.log?.flatten) {
      logObject['repo'] = this.repo;
    }
    if(!this.execContext?.config?.log?.logAttributes?.hideSourceFile && !this.execContext?.config?.log?.flatten) {
      logObject['sourceFile'] = this.sourceFile;
    }
    if(!this.execContext?.config?.log?.logAttributes?.hideMethod && !this.execContext?.config?.log?.flatten) {
      logObject['method'] = this._method;
    }
    if(!this.execContext?.config?.log?.logAttributes?.hideThread && !this.execContext?.config?.log?.flatten) {
      logObject['thread'] = this.execContext?.thread;
    }
    if(!this.execContext?.config?.log?.logAttributes?.hideRequestId && !this.execContext?.config?.log?.flatten) {
      logObject['requestid'] = this.execContext?.requestId;
    }
    if(!this.execContext?.config?.log?.logAttributes?.hideLevel && !this.execContext?.config?.log?.flatten) {
      logObject['logLevel'] = LoggerAdapter.levels[this.level];
    }
    logObject['data'] = data;
    return logObject;
  }

  private warnAllowed(): boolean {
    return this.level > LoggerAdapter._error;
  }

  private infoAllowed(): boolean {
    return this.level > LoggerAdapter._warn;
  }

  private debugAllowed(): boolean {
    return this.level > LoggerAdapter._info;
  }

  private traceAllowed(): boolean {
    return this.level > LoggerAdapter._debug;
  }
}

