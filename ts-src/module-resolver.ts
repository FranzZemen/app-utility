import {isPromise} from 'util/types';
import {EnhancedError, logErrorAndReturn, logErrorAndThrow} from './enhanced-error.js';
import {ExecutionContextI} from './execution-context.js';
import {
  loadFromModule,
  loadJSONFromPackage,
  loadJSONResource,
  ModuleDefinition, ModuleResolution
} from './load-from-module.js';
import {LoggerAdapter} from './log/index.js';

export enum LoadPackageType {
  json = 'json',
  package = 'object'
}

// If error an Error is expected to be throw or a Promise that resolves to one
export type ModuleResolutionSetterInvocation = ((refName: string, result: any, def?: ModuleResolutionResult, ...params) => true | Promise<true>);
/**
 * Invoked once the resolver has resolved ALL module loads and setters
 * Only called if the any associated module load and any setter was successful for all identical dedup ids.
 * Be careful, "successfulResolution" indicates overall module resolver successful for all resolutions.  This action
 * is not invoked if "this" resolution loading or setting failed or any actions that have the same dedup id.
 *
 * If error an Error is expected or a Promise that resolves to one
 */
export type ModuleResolutionActionInvocation = (successfulResolution: boolean, ...params) => true | Promise<true>;


export interface ModuleResolutionAction {
  /**
   * This is an id that if set will ensure all actions with this id execute only once.
   *
   * This can be helpful, for example, if one is initializing the same instance more than once
   * through an action; if sensitive state is involved one can use this unique id so that action occurs
   * only against that instance once.
   *
   * For example, if one is dynamically loading from a loop inside an object instance, and uses this method
   * to complete the loading process, it may or may not create adverse effects, but setting the same dedupId
   * will ensure the action is called only once, remembering that the action is called only once.
   */
  dedupId?: string,
  ownerIsObject: boolean,
  objectRef?: any,
  actionFunction: string | ModuleResolutionActionInvocation,
  paramsArray?: any[],
}

export interface ModuleResolutionSetter {
  ownerIsObject: boolean,
  objectRef?: any,
  setterFunction: string | ModuleResolutionSetterInvocation;
  paramsArray?: any[],  // This is for the setter function not the module load
}

export interface ModuleResolutionLoader {
  /**
   * Module to be loaded and eventually resolved
   */
  module: ModuleDefinition;
  /**
   * If loading a json from file, use module.moduleResolution = ModuleResolution.json and loadPackageType to LoadPackageType.json
   * If loading json from a module property, use module.moduleResolution as es or commonjs and loadPackageType as json
   * If loading a factory pattern, use module.moduleResolution as es or commonjs and loadPackageType as object
   */
  loadPackageType?: LoadPackageType;
}

export interface PendingModuleResolution {
  /**
   * This is the reference name to the resolution, and will be passed to the setter invocation, presumably to be used
   * as an id for a loaded item.  We're specifically constraining so that it isn't a function.  That could create tons of problems.
   */
  refName: BigInt | string | number | object;
  loader?: ModuleResolutionLoader;
  setter?: ModuleResolutionSetter;
  action?: ModuleResolutionAction;
}

export interface ModuleResolutionLoadingResult {
  // Loading successful
  resolved: boolean;
  resolvedObject?: any;
  error?: Error;
}

export interface ModuleResolutionSetterResult {
  // Field was successfully set
  resolved: boolean;
  error?: Error;
}

export interface ModuleResolutionActionResult {
  // Action successfully executed
  resolved: boolean;
  error?: Error;
}


export interface ModuleResolutionResult {
  resolution: PendingModuleResolution;
  loadingResult?: ModuleResolutionLoadingResult;
  setterResult?: ModuleResolutionSetterResult;
  actionResult?: ModuleResolutionActionResult;
}

export class ModuleResolver {
  pendingResolutions: PendingModuleResolution[] = [];
  moduleResolutionResults: ModuleResolutionResult[] = [];
  isResolving = false;

  constructor() {
  }

  static resolutionsHaveErrors(results: ModuleResolutionResult[]): boolean {
    return results.some(result => result.loadingResult?.error || result.setterResult?.error || result.actionResult?.error);
  }

  private static invokeSetter(result: ModuleResolutionResult, ec?: ExecutionContextI): true | Promise<true> {
    const log = new LoggerAdapter(ec, 'app-utility', 'module-resolver', 'invokeSetter');
    let setterResult: true | Promise<true>;
    if (result.resolution?.setter) {
      try {
        let paramsArray: any[];
        if (result.resolution.setter.paramsArray) {
          paramsArray = [result.resolution.refName, result.loadingResult.resolvedObject, result, ...result.resolution.setter.paramsArray];
        } else {
          paramsArray = [result.resolution.refName, result.loadingResult.resolvedObject, result];
        }
        setterResult = this.invoke<true>(result.resolution.setter.ownerIsObject, result.resolution.setter.setterFunction, result.resolution.setter.objectRef, paramsArray, ec);
      } catch (err) {
        log.warn(result, `Setter could not be successfully invoked`);
        logErrorAndReturn(err, log, ec);
        result.setterResult = {
          resolved: false,
          error: err
        };
        return true;
      }
      if (isPromise(setterResult)) {
        return setterResult
          .then(trueVal => {
            result.setterResult = {
              resolved: true
            };
            return true;
          }, err => {
            log.warn(result, `Setter could not be successfully invoked`);
            logErrorAndReturn(err, log, ec);
            result.setterResult = {
              resolved: false,
              error: err
            };
            return true;
          });
      } else {
        result.setterResult = {
          resolved: true
        };
        return setterResult;
      }
    } else {
      return true;
    }
  }

  private static invoke<R>(ownerIsObject: boolean, ownerFunction: string | ((...params) => R | Promise<R>), ownerThis?: any, paramsArray?: any[], ec?: ExecutionContextI): R | Promise<R> {
    const log = new LoggerAdapter(ec, 'app-utility', 'module-resolver', 'invoke');
    if (ownerIsObject === true && typeof ownerFunction !== 'string') {
      const err = new EnhancedError(`Invalid owner function ${ownerFunction} for ownerIsObject ${ownerIsObject} - it should be a string (not a function)`);
      logErrorAndThrow(err);
    } else if (ownerIsObject === false && typeof ownerFunction === 'string') {
      const err = new EnhancedError(`Invalid owner function ${ownerFunction} for ownerIsObject ${ownerIsObject} - it should be a function (not a string)`);
      logErrorAndThrow(err);
    }
    let actionResult: R | Promise<R>;
    try {
      if (ownerIsObject === true) {
        actionResult = ownerThis[ownerFunction as string](...paramsArray);
      } else {
        actionResult = (ownerFunction as ((...params) => R | Promise<R>))(...paramsArray);
      }
      return actionResult;
    } catch (err) {
      logErrorAndThrow(err, log, ec);
    }
  }

  hasPendingResolution(refName: string): boolean {
    return this.pendingResolutions.find(pendingResolution => pendingResolution.refName === refName) !== undefined;
  }

  hasPendingResolutions(): boolean {
    return (this.pendingResolutions.length != this.moduleResolutionResults.length);
  }

  add(pendingResolution: PendingModuleResolution, ec?: ExecutionContextI) {
    if (this.isResolving) {
      logErrorAndThrow(new EnhancedError(`Cannot add while isResolving is ${this.isResolving}`), new LoggerAdapter(ec, 'app-utility', 'module-resolver', 'add'), ec);
    }
    if (!this.pendingResolutions) {
      this.pendingResolutions = [];
    }
    // At least one of loading or action needs to be defined.
    if (!pendingResolution.loader && !pendingResolution.action) {
      logErrorAndThrow(new EnhancedError(`At least one of either loader or action needs to be defined on PendingModuleResolution`));
    }
    this.pendingResolutions.push(pendingResolution);
  }

  resolve(ec?: ExecutionContextI): ModuleResolutionResult[] | Promise<ModuleResolutionResult[]> {
    const log = new LoggerAdapter(ec, 'app-utility', 'module-resolver', 'resolve');
    if (this.isResolving) {
      logErrorAndThrow(new EnhancedError(`Cannot launch resolve again while isResolving is ${this.isResolving}`), log, ec);
    } else {
      this.isResolving = true;
    }
    if (!this.pendingResolutions || this.pendingResolutions.length === 0) {
      this.isResolving = false;
      return [];
    }
    if (!this.moduleResolutionResults) {
      this.moduleResolutionResults = [];
    }
    // The resolver may be resolving incrementally.  Only work on pending resolutions that haven't yet been resolved.
    let pendingResolutions: PendingModuleResolution[];
    let moduleResolutionResultPromises: (ModuleResolutionResult | Promise<ModuleResolutionResult>)[] = [];
    let incremental = false;
    if (this.moduleResolutionResults.length > 0 && this.pendingResolutions.length > this.moduleResolutionResults.length) {
      pendingResolutions = this.pendingResolutions.slice(this.moduleResolutionResults.length - 1);
      incremental = true;
    } else {
      pendingResolutions = this.pendingResolutions;
    }


    let async = false;
    pendingResolutions.forEach(pendingResolution => {
      let loadFunction: (ModuleDefinition, ExecutionContextI) => any | Promise<any>;
      if (pendingResolution?.loader !== undefined) {
        if (pendingResolution?.loader.module.moduleResolution === ModuleResolution.json) {
          loadFunction = loadJSONResource;
        } else {
          loadFunction = pendingResolution.loader.loadPackageType === LoadPackageType.json ? loadJSONFromPackage : loadFromModule;
        }
        try {
          const loadResult = loadFunction(pendingResolution.loader.module, ec);
          if (isPromise(loadResult)) {
            async = true;
            const moduleResolutionPromise = loadResult
              .then(obj => {
                const result: ModuleResolutionResult = {
                  resolution: pendingResolution,
                  loadingResult: {
                    resolved: true,
                    resolvedObject: obj
                  }
                };
                const setterResult = ModuleResolver.invokeSetter(result, ec);
                if (isPromise(setterResult)) {
                  return setterResult
                    .then(trueVal => {
                      return result;
                    });
                } else {
                  return result;
                }
              }, err => {
                log.warn(pendingResolution, `Pending resolution could not be successfully resolved`);
                logErrorAndReturn(err, log, ec);
                return ({
                  resolution: pendingResolution,
                  loadingResult: {
                    resolved: false,
                    error: err
                  }
                } as ModuleResolutionResult);
              });
            moduleResolutionResultPromises.push(moduleResolutionPromise);
          } else {
            const result: ModuleResolutionResult | Promise<ModuleResolutionResult> = {
              resolution: pendingResolution,
              loadingResult: {
                resolved: true,
                resolvedObject: loadResult
              }
            };
            const setterResult = ModuleResolver.invokeSetter(result, ec);
            let resultOrPromise: (ModuleResolutionResult | Promise<ModuleResolutionResult>);
            if (isPromise(setterResult)) {
              async = true;
              const resultOrPromise: (ModuleResolutionResult | Promise<ModuleResolutionResult>) = setterResult
                .then(trueVal => {
                  result.setterResult = {
                    resolved: true
                  };
                  return result;
                });
              moduleResolutionResultPromises.push(resultOrPromise);
            } else {
              result.setterResult = {
                resolved: true
              };
              moduleResolutionResultPromises.push(result);
            }
          }
        } catch (err) {
          log.warn(pendingResolution, `Pending resolution could not be successfully resolved`);
          logErrorAndReturn(err, log, ec);
          moduleResolutionResultPromises.push({
            resolution: pendingResolution,
            loadingResult: {
              resolved: false,
              error: err
            }
          });
        }
      } else if(pendingResolution.action !== undefined) {
        // If there was no loader, no result has been created yet.  Therefore we need to create a result to house the actions
        moduleResolutionResultPromises.push({
          resolution: pendingResolution
        })
      }
    });
    if (async) {
      if (moduleResolutionResultPromises.length > 0) {
        return Promise.all(moduleResolutionResultPromises)
          .then(moduleResolutionResults => {
            const actionResultOrPromise = this.invokeActions(moduleResolutionResults, ec);
            if (isPromise(actionResultOrPromise)) {
              return actionResultOrPromise
                .then((trueVal: true) => {
                  if (incremental) {
                    this.moduleResolutionResults = this.moduleResolutionResults.concat(moduleResolutionResults);
                  } else {
                    this.moduleResolutionResults = moduleResolutionResults;
                  }
                  this.isResolving = false;
                  return moduleResolutionResults;
                });
            } else {
              if (incremental) {
                this.moduleResolutionResults = this.moduleResolutionResults.concat(moduleResolutionResults);
              } else {
                this.moduleResolutionResults = moduleResolutionResults;
              }
              this.isResolving = false;
              return moduleResolutionResults;
            }
          }, err => {
            this.isResolving = false;
            throw logErrorAndReturn(err);
          });
      } else {
        this.isResolving = false;
        return Promise.resolve([]);
      }
    } else {
      const actionResultOrPromise = this.invokeActions(moduleResolutionResultPromises as ModuleResolutionResult[], ec);
      if (isPromise(actionResultOrPromise)) {
        return actionResultOrPromise
          .then((trueVal: true) => {
            if (incremental) {
              this.moduleResolutionResults = this.moduleResolutionResults.concat(moduleResolutionResultPromises as ModuleResolutionResult[]);
            } else {
              this.moduleResolutionResults = moduleResolutionResultPromises as ModuleResolutionResult[];
            }
            this.isResolving = false;
            return Promise.all(moduleResolutionResultPromises);
          });
      } else {
        if (incremental) {
          this.moduleResolutionResults = this.moduleResolutionResults.concat(moduleResolutionResultPromises as ModuleResolutionResult[]);
        } else {
          this.moduleResolutionResults = moduleResolutionResultPromises as ModuleResolutionResult[];
        }
        this.isResolving = false;
        return moduleResolutionResultPromises as ModuleResolutionResult[];
      }
    }
  }

  clear(ec?: ExecutionContextI) {
    if (this.isResolving) {
      logErrorAndThrow(new EnhancedError(`Cannot clear while isResolving is ${this.isResolving}`), new LoggerAdapter(ec, 'app-utility', 'module-resolver', 'add'), ec);
    }
    this.pendingResolutions = [];
    this.moduleResolutionResults = [];
  }

  hasResolutionErrors(): boolean {
    return this.moduleResolutionResults.some(moduleResolutionResult => moduleResolutionResult.loadingResult?.error || moduleResolutionResult.setterResult?.error || moduleResolutionResult.actionResult?.error);
  }

  private static hasErrors(result: ModuleResolutionResult): boolean {
    return result.loadingResult?.error !== undefined || result.setterResult?.error !== undefined || result.actionResult?.error !== undefined;
  }

  private invokeActions(moduleResolutionResults: (ModuleResolutionResult)[], ec?: ExecutionContextI): true | Promise<true> {
    const log = new LoggerAdapter(ec, 'app-utility', 'module-resolver', 'invokeActions');
    if (moduleResolutionResults.length === 0) {
      return true;
    }
    // Keep track of same actions and only invoke unique actions, including those that have errors
    const dedupSet: Set<string> = new Set<string>();
    // Actionable results will be invoked if there is an action and are no loading errors and no setter errors in the whole process as well as no duplicates
    // First filter out only those that have actions
    let actionableModuleResolutionResults: ModuleResolutionResult[] = moduleResolutionResults.filter(moduleResolutionResult => moduleResolutionResult.resolution?.action !== undefined);
    // Remove any that have errors associated with them, but remember that those actions were associated with errors
    actionableModuleResolutionResults = actionableModuleResolutionResults.filter(actionableModuleResolutionResult => {
      if(ModuleResolver.hasErrors(actionableModuleResolutionResult)) {
        dedupSet.add(actionableModuleResolutionResult.resolution.action.dedupId);
        return false;
      } else {
        return true;
      }
    });
    // Remove duplicates noting that we have to check against errors as well.
    actionableModuleResolutionResults = actionableModuleResolutionResults.filter(actionableModuleResolutionResult => {
      if(dedupSet.has(actionableModuleResolutionResult.resolution.action.dedupId)) {
        return false;
      } else {
        dedupSet.add(actionableModuleResolutionResult.resolution.action.dedupId);
        return true;
      }
    });
    if (actionableModuleResolutionResults.length === 0) {
      return true;
    }
    const overallSuccess = actionableModuleResolutionResults.length === moduleResolutionResults.length;
    let actionResult: true | Promise<true>;
    let async = false;
    const actionResultsOrPromises: (true | Promise<true>)[] = [];
    actionableModuleResolutionResults.forEach(result => {
      try {
        let paramsArray: any[];
        if (result.resolution.action.paramsArray) {
          paramsArray = [overallSuccess, ...result.resolution.action.paramsArray];
        } else {
          paramsArray = [overallSuccess];
        }
        actionResult = ModuleResolver.invoke<true>(result.resolution.action.ownerIsObject, result.resolution.action.actionFunction, result.resolution.action.objectRef, paramsArray, ec);
      } catch (err) {
        log.warn(result, `Action could not be successfully invoked`);
        logErrorAndReturn(err, log, ec);
        result.actionResult = {
          resolved: false,
          error: err
        };
        return;
      }
      if (isPromise(actionResult)) {
        async = true;
        let promise: Promise<true> = actionResult
          .then(() => {
            result.actionResult = {
              resolved: true
            };
            return true;
          }, err => {
            log.warn(result, `Action could not be successfully invoked`);
            logErrorAndReturn(err, log, ec);
            result.actionResult = {
              resolved: false,
              error: err
            };
            return true;
          });
        actionResultsOrPromises.push(promise);
      } else {
        result.actionResult = {
          resolved: true
        };
        actionResultsOrPromises.push(true);
      }
    });
    if (async) {
      return Promise.all(actionResultsOrPromises)
        .then(trueVal => {
          return true;
        });
    } else {
      return true;
    }
  }
}
