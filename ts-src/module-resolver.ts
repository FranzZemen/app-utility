import {isPromise} from 'util/types';
import {EnhancedError, logErrorAndReturn} from './enhanced-error.js';
import {ExecutionContextI} from './execution-context.js';
import {
  loadFromModule,
  loadJSONFromPackage,
  loadJSONResource,
  ModuleDefinition,
  ModuleResolution
} from './load-from-module.js';
import {LoggerAdapter} from './log/index.js';

export enum LoadPackageType {
  json = 'json',
  package = 'object'
}

export type ModuleResolutionSetter = ((result: any | Promise<any>, ...params) => true | Promise<true>);


export interface PendingModuleResolution {
  ownerIsObject: boolean,
  ownerThis: any,
  ownerSetter: string | ModuleResolutionSetter;
  paramsArray?: any[],  // This is for the setter function not the module load
  module: ModuleDefinition;

  // If not set, assumes LoadPackageType.object
  loadPackageType?: LoadPackageType;
}

interface ModuleResolutionResult {
  resolution: PendingModuleResolution;
  // Module/value etc. was loaded
  loaded: boolean;
  // Field was successfully set
  resolved: boolean;
  // The object that was loaded and resolved, or the error if failed
  resolvedObject?: any;
  error?: Error;
}

export class ModuleResolver {
  pendingResolutions: PendingModuleResolution[] = [];
  moduleResolutionPromises: Promise<ModuleResolutionResult>[] = [];

  constructor() {
  }

  private static invokeSetter(result: ModuleResolutionResult, ec?: ExecutionContextI): Promise<true> {
    const log = new LoggerAdapter(ec, 'app-utility', 'module-resolver', 'invokeSetter');
    if (result.resolution.ownerIsObject === true) {
      if (typeof result.resolution.ownerSetter === 'string') {
        let setterResult: true | Promise<true>;
        try {
          if (result.resolution.paramsArray) {
            setterResult = result.resolution.ownerThis[result.resolution.ownerSetter](result.resolvedObject, ...result.resolution.paramsArray);
          } else {
            setterResult = result.resolution.ownerThis[result.resolution.ownerSetter](result.resolvedObject);
          }
        } catch (err) {
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
        } else {
          return Promise.resolve(setterResult);
        }
      } else {
        const errMsg = `Invalid ownerSetter for ownerIsObject - it should be a string`;
        log.warn(result, errMsg);
        const err = new EnhancedError(errMsg);
        logErrorAndReturn(err);
        result.resolved = false;
        result.error = err;
        return Promise.resolve(true);
      }
    } else {
      if (typeof result.resolution.ownerSetter === 'string') {
        const errMsg = `Invalid ownerSetter - it should be a ModuleResolutionSetter`;
        log.warn(result, errMsg);
        const err = new EnhancedError(errMsg);
        logErrorAndReturn(err);
        result.resolved = false;
        result.error = err;
        return Promise.resolve(true);
      } else {
        let setterResult: any | Promise<any>;
        try {
          if (result.resolution.paramsArray) {
            setterResult = result.resolution.ownerSetter(result.resolvedObject, ...result.resolution.paramsArray);
          } else {
            setterResult = result.resolution.ownerSetter(result.resolvedObject);
          }
        } catch (err) {
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
        } else {
          return Promise.resolve(setterResult);
        }
      }
    }
  }

  add(pendingResolution: PendingModuleResolution, ec?: ExecutionContextI) {
    if (!this.pendingResolutions) {
      this.pendingResolutions = [];
    }
    this.pendingResolutions.push(pendingResolution);
  }

  resolve(ec?: ExecutionContextI): Promise<ModuleResolutionResult[]> {
    const log = new LoggerAdapter(ec, 'app-utility', 'module-resolver', 'resolve');
    if (!this.pendingResolutions || this.pendingResolutions.length === 0) {
      return Promise.resolve([]);
    }
    if (!this.moduleResolutionPromises) {
      this.moduleResolutionPromises = [];
    }
    this.pendingResolutions.forEach(pendingResolution => {
      let loadFunction: (ModuleDefinition, ExecutionContextI) => any | Promise<any>;
      if(pendingResolution.module.moduleResolution === ModuleResolution.json) {
        loadFunction = loadJSONResource;
      } else {
        loadFunction = pendingResolution.loadPackageType === LoadPackageType.json ? loadJSONFromPackage : loadFromModule;
      }

      const resultPromise: Promise<ModuleResolutionResult> = new Promise<ModuleResolutionResult>((resolve, reject) => {
        try {
          const loadResult = loadFunction(pendingResolution.module, ec);
          if (isPromise(loadResult)) {
            loadResult
              .then(obj => {
                const result: ModuleResolutionResult = {
                  resolution: pendingResolution,
                  loaded: true,
                  resolved: false,
                  resolvedObject: obj
                };
                ModuleResolver.invokeSetter(result, ec)
                  .then(trueVal => {
                    result.resolved = true;
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
                } as ModuleResolutionResult);
              });
          } else {
            const result: ModuleResolutionResult = {
              resolution: pendingResolution,
              loaded: true,
              resolved: false,
              resolvedObject: loadResult
            };
            ModuleResolver.invokeSetter(result, ec)
              .then(trueVal => {
                resolve(result);
                result.resolved = true;
              }, err => {
                logErrorAndReturn(err, log, ec);
                result.resolved = false;
                result.error = err;
                resolve(result);
              });
          }
        } catch (err) {
          log.warn(pendingResolution, `Pending resolution could not be successfully resolved`);
          logErrorAndReturn(err, log, ec);
          resolve({
            resolution: pendingResolution,
            loaded: false,
            resolved: false,
            error: err
          } as ModuleResolutionResult);
        }
      });
      this.moduleResolutionPromises.push(resultPromise);
    });
    if(this.moduleResolutionPromises.length > 0) {
      return Promise.all(this.moduleResolutionPromises)
        .then(values => {
          return values;
        }, err => {
          throw logErrorAndReturn(err);
        })
    } else {
      return Promise.resolve([]);
    }

  }

  clear() {
    this.pendingResolutions = [];
    this.moduleResolutionPromises = [];
  }
}
