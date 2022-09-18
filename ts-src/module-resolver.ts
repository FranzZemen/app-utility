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

export type ModuleResolutionSetter = ((refName: any, result: any, def?: ModuleResolutionResult,  ...params) => true | Promise<true>);


export interface PendingModuleResolution {
  refName: any,
  ownerIsObject: boolean,
  ownerThis: any,
  ownerSetter: string | ModuleResolutionSetter;
  paramsArray?: any[],  // This is for the setter function not the module load
  module: ModuleDefinition;

  // If not set, assumes LoadPackageType.object
  loadPackageType?: LoadPackageType;
}

export interface ModuleResolutionResult {
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
  moduleResolutionPromises: (ModuleResolutionResult | Promise<ModuleResolutionResult>)[] = [];

  constructor() {
  }

  hasResolution(refName: string): boolean {
    return this.pendingResolutions.find(pendingResulton => pendingResulton.refName === refName) !== undefined;
  }

  hasPendingResolutions(): boolean {
    return (this.pendingResolutions.length > 0 && this.moduleResolutionPromises.length === 0);
  }

  private static invokeSetter(result: ModuleResolutionResult, ec?: ExecutionContextI): true | Promise<true> {
    const log = new LoggerAdapter(ec, 'app-utility', 'module-resolver', 'invokeSetter');
    if (result.resolution.ownerIsObject === true) {
      if (typeof result.resolution.ownerSetter === 'string') {
        let setterResult: true | Promise<true>;
        try {
          if (result.resolution.paramsArray) {
            setterResult = result.resolution.ownerThis[result.resolution.ownerSetter](result.resolution.refName, result.resolvedObject, result, ...result.resolution.paramsArray);
          } else {
            setterResult = result.resolution.ownerThis[result.resolution.ownerSetter](result.resolution.refName, result.resolvedObject, result);
          }
        } catch (err) {
          log.warn(result, `Setter could not be successfully invoked`);
          logErrorAndReturn(err, log, ec);
          result.resolved = false;
          result.error = err;
          return true;
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
          return setterResult;
        }
      } else {
        const errMsg = `Invalid ownerSetter for ownerIsObject - it should be a string`;
        log.warn(result, errMsg);
        const err = new EnhancedError(errMsg);
        logErrorAndReturn(err);
        result.resolved = false;
        result.error = err;
        return true;
      }
    } else {
      if (typeof result.resolution.ownerSetter === 'string') {
        const errMsg = `Invalid ownerSetter - it should be a ModuleResolutionSetter`;
        log.warn(result, errMsg);
        const err = new EnhancedError(errMsg);
        logErrorAndReturn(err);
        result.resolved = false;
        result.error = err;
        return true;
      } else {
        let setterResult: any | Promise<any>;
        try {
          if (result.resolution.paramsArray) {
            setterResult = result.resolution.ownerSetter(result.resolution.refName, result.resolvedObject, result, ...result.resolution.paramsArray);
          } else {
            setterResult = result.resolution.ownerSetter(result.resolution.refName, result.resolvedObject, result);
          }
        } catch (err) {
          log.warn(result, `Setter could not be successfully invoked`);
          logErrorAndReturn(err, log, ec);
          result.resolved = false;
          result.error = err;
          return true;
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
          return setterResult;
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

  resolve(ec?: ExecutionContextI): ModuleResolutionResult[] | Promise<ModuleResolutionResult[]> {
    const log = new LoggerAdapter(ec, 'app-utility', 'module-resolver', 'resolve');
    if (!this.pendingResolutions || this.pendingResolutions.length === 0) {
      return [];
    }
    if (!this.moduleResolutionPromises) {
      this.moduleResolutionPromises = [];
    }
    let async = false;
    this.pendingResolutions.forEach(pendingResolution => {
      let loadFunction: (ModuleDefinition, ExecutionContextI) => any | Promise<any>;
      if (pendingResolution.module.moduleResolution === ModuleResolution.json) {
        loadFunction = loadJSONResource;
      } else {
        loadFunction = pendingResolution.loadPackageType === LoadPackageType.json ? loadJSONFromPackage : loadFromModule;
      }
      try {
        const loadResult = loadFunction(pendingResolution.module, ec);
        if (isPromise(loadResult)) {
          async = true;
          const moduleResolutionPromise = loadResult
            .then(obj => {
              const result: ModuleResolutionResult = {
                resolution: pendingResolution,
                loaded: true,
                resolved: false,
                resolvedObject: obj
              };
              const setterResult = ModuleResolver.invokeSetter(result, ec);
              if (isPromise(setterResult)) {
                return setterResult
                  .then(trueVal => {
                    result.resolved = true;
                    return result;
                  }, err => {
                    logErrorAndReturn(err, log, ec);
                    result.resolved = false;
                    result.error = err;
                    return result;
                  });
              } else {
                result.resolved = true;
                return result;
              }
            }, err => {
              log.warn(pendingResolution, `Pending resolution could not be successfully resolved`);
              logErrorAndReturn(err, log, ec);
              return ({
                resolution: pendingResolution,
                loaded: false,
                resolved: false,
                error: err
              });
            });
          this.moduleResolutionPromises.push(moduleResolutionPromise);
        } else {
          const result: ModuleResolutionResult = {
            resolution: pendingResolution,
            loaded: true,
            resolved: false,
            resolvedObject: loadResult
          };
          const setterResult = ModuleResolver.invokeSetter(result, ec);
          let resultOrPromise: (ModuleResolutionResult | Promise<ModuleResolutionResult>);
          if (isPromise(setterResult)) {
            async = true;
            const resultOrPromise: (ModuleResolutionResult | Promise<ModuleResolutionResult>) = setterResult
              .then(trueVal => {
                result.resolved = true;
                return result;
              }, err => {
                logErrorAndReturn(err, log, ec);
                result.resolved = false;
                result.error = err;
                return result;
              });
            this.moduleResolutionPromises.push(resultOrPromise);
          } else {
            result.resolved = true;
            this.moduleResolutionPromises.push(result);
          }
        }
      } catch (err) {
        log.warn(pendingResolution, `Pending resolution could not be successfully resolved`);
        logErrorAndReturn(err, log, ec);
        this.moduleResolutionPromises.push ({
          resolution: pendingResolution,
          loaded: false,
          resolved: false,
          error: err
        });
      }
    });
    if(async) {
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
    } else {
      return this.moduleResolutionPromises as ModuleResolutionResult[];
    }
  }

  clear() {
    this.pendingResolutions = [];
    this.moduleResolutionPromises = [];
  }
}
