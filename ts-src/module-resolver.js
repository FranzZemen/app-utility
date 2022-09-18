import { isPromise } from 'util/types';
import { EnhancedError, logErrorAndReturn } from './enhanced-error.js';
import { loadFromModule, loadJSONFromPackage } from './load-from-module.js';
import { LoggerAdapter } from './log/index.js';
export var LoadPackageType;
(function (LoadPackageType) {
    LoadPackageType["json"] = "json";
    LoadPackageType["package"] = "object";
})(LoadPackageType || (LoadPackageType = {}));
export class ModuleResolver {
    constructor() {
        this.pendingResolutions = [];
        this.moduleResolutionPromises = [];
    }
    static invokeSetter(result, ec) {
        const log = new LoggerAdapter(ec, 'app-utility', 'module-resolver', 'invokeSetter');
        if (result.resolution.ownerIsObject === true) {
            if (typeof result.resolution.ownerSetter === 'string') {
                let setterResult;
                try {
                    if (result.resolution.paramsArray) {
                        setterResult = result.resolution.ownerThis[result.resolution.ownerSetter](result.resolvedObject, ...result.resolution.paramsArray);
                    }
                    else {
                        setterResult = result.resolution.ownerThis[result.resolution.ownerSetter](result.resolvedObject);
                    }
                }
                catch (err) {
                    log.warn(result, `Setter could not be successfully invoked`);
                    logErrorAndReturn(err, log, ec);
                    result.resolved = false;
                    result.error = err;
                    return Promise.resolve(true);
                }
                if (isPromise(setterResult)) {
                    return setterResult
                        .then(trueVal => {
                        return true;
                    }, err => {
                        log.warn(result, `Setter could not be successfully invoked`);
                        logErrorAndReturn(err, log, ec);
                        result.resolved = false;
                        result.error = err;
                        return true;
                    });
                }
                else {
                    return Promise.resolve(setterResult);
                }
            }
            else {
                const errMsg = `Invalid ownerSetter for ownerIsObject - it should be a string`;
                log.warn(result, errMsg);
                const err = new EnhancedError(errMsg);
                logErrorAndReturn(err);
                result.resolved = false;
                result.error = err;
                return Promise.resolve(true);
            }
        }
        else {
            if (typeof result.resolution.ownerSetter === 'string') {
                const errMsg = `Invalid ownerSetter - it should be a ModuleResolutionSetter`;
                log.warn(result, errMsg);
                const err = new EnhancedError(errMsg);
                logErrorAndReturn(err);
                result.resolved = false;
                result.error = err;
                return Promise.resolve(true);
            }
            else {
                let setterResult;
                try {
                    if (result.resolution.paramsArray) {
                        setterResult = result.resolution.ownerSetter(result.resolvedObject, ...result.resolution.paramsArray);
                    }
                    else {
                        setterResult = result.resolution.ownerSetter(result.resolvedObject);
                    }
                }
                catch (err) {
                    log.warn(result, `Setter could not be successfully invoked`);
                    logErrorAndReturn(err, log, ec);
                    result.resolved = false;
                    result.error = err;
                    return Promise.resolve(true);
                }
                if (isPromise(setterResult)) {
                    return setterResult
                        .then(trueVal => {
                        return true;
                    }, err => {
                        log.warn(result, `Setter could not be successfully invoked`);
                        logErrorAndReturn(err, log, ec);
                        result.resolved = false;
                        result.error = err;
                        return true;
                    });
                }
                else {
                    return Promise.resolve(setterResult);
                }
            }
        }
    }
    add(pendingResolution, ec) {
        if (!this.pendingResolutions) {
            this.pendingResolutions = [];
        }
        this.pendingResolutions.push(pendingResolution);
    }
    resolve(ec) {
        const log = new LoggerAdapter(ec, 'app-utility', 'module-resolver', 'resolve');
        if (!this.pendingResolutions || this.pendingResolutions.length === 0) {
            return [];
        }
        if (!this.moduleResolutionPromises) {
            this.moduleResolutionPromises = [];
        }
        this.pendingResolutions.forEach(pendingResolution => {
            let loadFunction = pendingResolution.loadPackageType === LoadPackageType.json ? loadJSONFromPackage : loadFromModule;
            const resultPromise = new Promise((resolve, reject) => {
                try {
                    const loadResult = loadFunction(pendingResolution.module, ec);
                    if (isPromise(loadResult)) {
                        loadResult
                            .then(obj => {
                            const result = {
                                resolution: pendingResolution,
                                loaded: true,
                                resolved: false,
                                resolvedObject: obj
                            };
                            ModuleResolver.invokeSetter(result, ec)
                                .then(trueVal => {
                                resolve(result);
                            }, err => {
                                logErrorAndReturn(err, log, ec);
                                result.resolved = false;
                                result.error = err;
                                resolve(result);
                            });
                        }, err => {
                            log.warn(pendingResolution, `Pending resolution could not be successfully resolved`);
                            logErrorAndReturn(err, log, ec);
                            resolve({
                                resolution: pendingResolution,
                                loaded: false,
                                resolved: false,
                                error: err
                            });
                        });
                    }
                    else {
                        const result = {
                            resolution: pendingResolution,
                            loaded: true,
                            resolved: false,
                            resolvedObject: loadResult
                        };
                        ModuleResolver.invokeSetter(result, ec)
                            .then(trueVal => {
                            resolve(result);
                        }, err => {
                            logErrorAndReturn(err, log, ec);
                            result.resolved = false;
                            result.error = err;
                            resolve(result);
                        });
                    }
                }
                catch (err) {
                    log.warn(pendingResolution, `Pending resolution could not be successfully resolved`);
                    logErrorAndReturn(err, log, ec);
                    resolve({
                        resolution: pendingResolution,
                        loaded: false,
                        resolved: false,
                        error: err
                    });
                }
            });
            this.moduleResolutionPromises.push(resultPromise);
        });
    }
    clear() {
        this.pendingResolutions = [];
        this.moduleResolutionPromises = [];
    }
}
//# sourceMappingURL=module-resolver.js.map