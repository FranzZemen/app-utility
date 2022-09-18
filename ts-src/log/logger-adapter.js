import { createRequire } from 'module';
import { inspect } from 'util';
import { isPromise } from 'util/types';
import { NativeLogger } from './native-logger.js';
import { loadFromModule } from '../load-from-module.js';
import { FgCyan, FgGreen, FgMagenta, FgRed, FgYellow, Reset } from './color-constants.js';
const requireModule = createRequire(import.meta.url);
const moment = requireModule('moment');
const utc = moment.utc;
const Moment = moment.Moment;
export class LoggerAdapter {
    constructor(execContext, repo = '', sourceFile = '', _method = '', loggerImpl) {
        this.execContext = execContext;
        this.repo = repo;
        this.sourceFile = sourceFile;
        this._method = _method;
        this.level = LoggerAdapter.levels.indexOf(LoggerAdapter.lvl_info);
        this.timingContext = '';
        this.start = undefined;
        this.interim = undefined;
        this.showHiddenInspectAttributes = false;
        this.depth = 5;
        this.momentFormat = 'YYYY-MM-DD[T]HH:mm:ss.SSS';
        this.pendingEsLoad = false;
        if (!this.execContext) {
            this.execContext = {
                config: {
                    log: {
                        logAttributes: {
                            hideAppContext: true,
                            hideRepo: true,
                            hideSourceFile: true,
                            hideMethod: true,
                            hideThread: true,
                            hideLevel: true,
                            hideRequestId: true
                        }
                    }
                }
            };
        }
        if (!this.execContext.config) {
            this.execContext.config = {
                log: {
                    logAttributes: {
                        hideAppContext: true,
                        hideRepo: true,
                        hideSourceFile: true,
                        hideMethod: true,
                        hideThread: true,
                        hideLevel: true,
                        hideRequestId: true
                    }
                }
            };
        }
        if (!this.execContext.config.log) {
            this.execContext.config.log = {
                logAttributes: {
                    hideAppContext: true,
                    hideRepo: true,
                    hideSourceFile: true,
                    hideMethod: true,
                    hideThread: true,
                    hideLevel: true,
                    hideRequestId: true
                }
            };
        }
        if (!this.execContext.config.log.logAttributes) {
            this.execContext.config.log.logAttributes = {
                hideAppContext: true,
                hideRepo: true,
                hideSourceFile: true,
                hideMethod: true,
                hideThread: true,
                hideLevel: true,
                hideRequestId: true
            };
        }
        if (this.execContext.config.log.level) {
            this.level = LoggerAdapter.levels.indexOf(this.execContext.config.log.level);
            if (this.execContext.config.log.showHidden) {
                this.showHiddenInspectAttributes = this.execContext.config.log.showHidden;
            }
        }
        else {
            this.level = LoggerAdapter.levels.indexOf(LoggerAdapter.lvl_info);
            this.showHiddenInspectAttributes = false;
        }
        this.depth = this.execContext.config.log.depth === undefined ? 5 : this.execContext.config.log.depth;
        this.initializeOverrides();
        const logAttributes = this.execContext.config.log.logAttributes;
        this.attributesAsString = ''
            + (logAttributes.hideAppContext === false ? '; appContext: ' + this.execContext?.appContext : '')
            + (logAttributes.hideRepo === false ? '; repo: ' + this.repo : '')
            + (logAttributes.hideSourceFile === false ? '; sourceFile: ' + this.sourceFile : '')
            + (logAttributes.hideMethod === false ? '; method: ' + this._method : '')
            + (logAttributes.hideThread === false ? '; thread: ' + this.execContext?.thread : '')
            + (logAttributes.hideRequestId === false ? '; requestId: ' + this.execContext?.requestId : '')
            + (logAttributes.hideLevel === false ? '; logLevel: ' + LoggerAdapter.levels[this.level] : '');
        if (loggerImpl) {
            this.logger = loggerImpl;
        }
        else {
            const module = this.execContext?.config?.log?.loggerModule;
            if (module && module.moduleName && (module.constructorName || module.functionName)) {
                const impl = loadFromModule(module);
                if (isPromise(impl)) {
                    this.pendingEsLoad = true;
                    this.logger = new NativeLogger();
                    this.logger.warn(this.execContext?.config.log?.loggerModule, 'Detected ES module as logger implementation, using native logger until it loads');
                    impl
                        .then(logger => {
                        this.logger.warn('ES module as logger implementation loaded dynamically');
                        this.logger = logger;
                        this.pendingEsLoad = false;
                    });
                }
                else {
                    this.logger = impl;
                }
            }
            else {
                this.logger = new NativeLogger();
            }
        }
    }
    setMethod(_method) {
        this._method = _method;
        return this;
    }
    error(err, stacktrace, color = FgRed) {
        this.logger.error(err, stacktrace, color);
    }
    warn(data, message, color = FgYellow) {
        if (this.warnAllowed()) {
            this.log(this.logger.warn, data, message, color, 'WARN:');
        }
    }
    info(data, message, color = FgGreen) {
        if (this.infoAllowed()) {
            this.log(this.logger.info, data, message, color, 'INFO:');
        }
    }
    debug(data, message, color = FgCyan) {
        if (this.debugAllowed()) {
            this.log(this.logger.debug, data, message, color, 'DEBUG:');
        }
    }
    trace(data, message, color = FgMagenta) {
        if (this.traceAllowed()) {
            this.log(this.logger.debug, data, message, color, 'TRACE:');
        }
    }
    log(logMethod, data, message, color, cwcPrefix) {
        if (data && (typeof data === 'string')) {
            const str = `${utc().format(this.momentFormat)} ${cwcPrefix} ${(message ? message + ' ' + data + this.attributesAsString : data + this.attributesAsString)}`;
            logMethod(color + str + Reset, '');
        }
        else if (this.execContext?.config?.log?.flatten) {
            const str = `${utc().format(this.momentFormat)} ${cwcPrefix} ${(message ? message + ' ' + this.attributesAsString : this.attributesAsString)}` + '\r\n' + inspect(this.getLogObject(data), this.showHiddenInspectAttributes, this.depth);
            logMethod(color + str + Reset, '');
        }
        else {
            const str = `${utc().format(this.momentFormat)} ${cwcPrefix}` + '\r\n' + inspect(this.getLogObject(data, message), this.showHiddenInspectAttributes, this.depth);
            logMethod(color + str + Reset, '');
        }
    }
    startTiming(context) {
        if (this.start) {
            this.stopTiming();
        }
        this.start = Date.now();
        this.interim = this.start;
        this.timingContext = context;
        this.trace({ timing: context, start: this.start }, 'Start Timing');
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
            this.trace({ timing: this.timingContext, elapsed: (now - this.start) }, 'stopTiming');
            this.start = undefined;
            this.interim = undefined;
            this.timingContext = '';
        }
    }
    initializeOverrides() {
        if (this.execContext && this.execContext.config && this.execContext.config.log && this.execContext.config.log.overrides) {
            const override = this.execContext.config.log.overrides.find(override => override.repo === this.repo);
            if (override) {
                if (!override.source && !override.method) {
                    this.level = LoggerAdapter.levels.indexOf(override.level);
                    if (override.showHidden) {
                        this.showHiddenInspectAttributes = override.showHidden;
                    }
                    if (override.depth) {
                        this.depth = override.depth;
                    }
                }
                else if (!override.method) {
                    const matchesSourceFile = override.source ? override.source === this.sourceFile : true;
                    if (matchesSourceFile) {
                        this.level = LoggerAdapter.levels.indexOf(override.level);
                        if (override.showHidden) {
                            this.showHiddenInspectAttributes = override.showHidden;
                        }
                        if (override.depth) {
                            this.depth = override.depth;
                        }
                    }
                }
                else {
                    const matchesSourceFile = override.source ? override.source === this.sourceFile : true;
                    const matchesMethod = override && override.method ? override.method === this._method : true;
                    if (matchesSourceFile && matchesMethod) {
                        this.level = LoggerAdapter.levels.indexOf(override.level);
                        if (override.showHidden) {
                            this.showHiddenInspectAttributes = override.showHidden;
                        }
                        if (override.depth) {
                            this.depth = override.depth;
                        }
                    }
                }
            }
        }
    }
    getLogObject(data, message) {
        let logObject = {};
        if (message) {
            logObject['message'] = message;
        }
        if (!this.execContext?.config?.log?.logAttributes?.hideAppContext && !this.execContext?.config?.log?.flatten) {
            logObject['appContext'] = this.execContext?.appContext;
        }
        if (!this.execContext?.config?.log?.logAttributes?.hideRepo && !this.execContext?.config?.log?.flatten) {
            logObject['repo'] = this.repo;
        }
        if (!this.execContext?.config?.log?.logAttributes?.hideSourceFile && !this.execContext?.config?.log?.flatten) {
            logObject['sourceFile'] = this.sourceFile;
        }
        if (!this.execContext?.config?.log?.logAttributes?.hideMethod && !this.execContext?.config?.log?.flatten) {
            logObject['method'] = this._method;
        }
        if (!this.execContext?.config?.log?.logAttributes?.hideThread && !this.execContext?.config?.log?.flatten) {
            logObject['thread'] = this.execContext?.thread;
        }
        if (!this.execContext?.config?.log?.logAttributes?.hideRequestId && !this.execContext?.config?.log?.flatten) {
            logObject['requestid'] = this.execContext?.requestId;
        }
        if (!this.execContext?.config?.log?.logAttributes?.hideLevel && !this.execContext?.config?.log?.flatten) {
            logObject['logLevel'] = LoggerAdapter.levels[this.level];
        }
        logObject['data'] = data;
        return logObject;
    }
    warnAllowed() {
        return this.level > LoggerAdapter._error;
    }
    infoAllowed() {
        return this.level > LoggerAdapter._warn;
    }
    debugAllowed() {
        return this.level > LoggerAdapter._info;
    }
    traceAllowed() {
        return this.level > LoggerAdapter._debug;
    }
}
LoggerAdapter.lvl_none = 'none';
LoggerAdapter.lvl_error = 'error';
LoggerAdapter.lvl_warn = 'warn';
LoggerAdapter.lvl_info = 'info';
LoggerAdapter.lvl_debug = 'debug';
LoggerAdapter.lvl_trace = 'trace';
LoggerAdapter._noLogging = 0;
LoggerAdapter._error = 1;
LoggerAdapter._warn = 2;
LoggerAdapter._info = 3;
LoggerAdapter._debug = 4;
LoggerAdapter._trace = 5;
LoggerAdapter._none = 6;
LoggerAdapter.levels = [LoggerAdapter.lvl_none, LoggerAdapter.lvl_error, LoggerAdapter.lvl_warn, LoggerAdapter.lvl_info, LoggerAdapter.lvl_debug, LoggerAdapter.lvl_trace];
//# sourceMappingURL=logger-adapter.js.map