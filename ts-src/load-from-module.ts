import Validator, {ValidationError, ValidationSchema} from 'fastest-validator';
import {createRequire} from 'node:module';
import {isPromise} from 'util/types';
import {EnhancedError, logErrorAndReturn, logErrorAndThrow} from './enhanced-error.js';

import {ExecutionContextI} from './execution-context.js';
import {CheckFunction, isAsyncCheckFunction, isLoadSchema, isSyncCheckFunction} from './fastest-validator-util.js';
import {LoggerAdapter} from './log/index.js';

const requireModule = createRequire(import.meta.url);
const objectPath = requireModule('object-path');

export enum ModuleResolution {
  commonjs = 'commonjs',
  es = 'es'
}

export interface LoadSchema {
  validationSchema: ValidationSchema;
  useNewCheckerFunction: boolean;
}

export class TypeOf extends Set<string> {
  static String = new TypeOf('string');
  static Number = new TypeOf('number');
  static Boolean = new TypeOf('boolean');
  static BigInt = new TypeOf('bigint');
  static Function = new TypeOf('function');
  static Symbol = new TypeOf('symbol');
  static Object = new TypeOf('object');

  private constructor(typeOf: string, ec?: ExecutionContextI) {
    super();
    super.add('string');
    super.add('number');
    super.add('boolean');
    super.add('bigint');
    super.add('function');
    super.add('symbol');
    super.add('object');
    if (this.has(typeOf)) {
      this._typeOf = typeOf;
    } else {
      logErrorAndThrow(new EnhancedError('Attempt to initialize TypeOf with value not compatible with operator "typeof"'), new LoggerAdapter(ec, 'app-utility', 'load-from-module', 'TypeOf constructor'), ec);
    }
  }

  private _typeOf: string;

  get typeOf(): string {
    return this._typeOf;
  }

  add(value: string): this {
    throw new Error('TypeOf implementation of Set is immutable');
  }

  clear() {
    throw new Error('TypeOf implementation of Set is immutable');
  }

  delete(value: string): boolean {
    throw new Error('TypeOf implementation of Set is immutable');
  }
}

export function isTypeOf(typeOf: any | TypeOf): typeOf is TypeOf {
  return typeOf instanceof TypeOf;
}

export type ModuleDefinition = {
  moduleName: string,
  functionName?: string,
  constructorName?: string,
  propertyName?: string,
  moduleResolution?: ModuleResolution,
  loadSchema?: LoadSchema | TypeOf,
};


export function isModuleDefinition(module: any | ModuleDefinition): module is ModuleDefinition {
  const moduleNameExists = 'moduleName' in module;
  const functionNameExists = 'functionName' in module;
  const constructorNameExists = 'constructorName' in module;
  const propertyNameExists = 'propertyName' in module;
  const moduleResolutionExists = 'moduleResolution' in module;
  return moduleNameExists  // moduleName must always be present
    && ((!functionNameExists && !constructorNameExists && !propertyNameExists) // None of the constraints are present
      || (functionNameExists && !(constructorNameExists || propertyNameExists)) // functionName is present but not the other two
      || (constructorNameExists && !(functionNameExists || propertyNameExists)) // constructorName is present but not the other two
      || (propertyNameExists && !(functionNameExists || constructorNameExists))); // propertyName is present but not the other two
}

export function isConstrainedModuleDefinition(module: any | ModuleDefinition): module is ModuleDefinition {
  // One of the constraints is present (and only one).
  return isModuleDefinition(module) && (module.constructorName !== undefined || module.functionName !== undefined || module.propertyName !== undefined);
}

export const moduleDefinitionSchema = {
  type: 'object',
  optional: true,
  props: {
    moduleName: {
      type: 'string',
      optional: false
    },
    functionName: {
      type: 'string',
      optional: true
    },
    constructorName: {
      type: 'string',
      optional: true
    },
    propertyName: {
      type: 'string',
      optional: true
    }
  }
};

/**
 *
 * @param def
 * @param obj
 * @param check If LoadSchema or Check Function, that's used to validate the loaded object's contents.
 * If TypeOf, this validates the Object itself using the typeof operator.
 * @param ec
 */
function validateSchema<T>(def: string | ModuleDefinition, obj, check: LoadSchema | CheckFunction | TypeOf, ec?: ExecutionContextI): T | Promise<T> {
  const log = new LoggerAdapter(undefined, '@franzzemen/app-utility', 'load-from-module', 'validationCheck');
  let validationCheck: CheckFunction;
  if (check) {
    if (isTypeOf(check)) {
      if (typeof obj === check.typeOf) {
        return obj;
      } else {
        const result: ValidationError[] = [{
          actual: typeof obj,
          expected: check.typeOf,
          field: 'n/a',
          message: `returned instance failed 'typeof instance === "${check.typeOf}"'`,
          type: 'n/a'
        }];
        log.warn({def, schema: 'TypeOf', obj, result}, 'TypeOf validation failed.');
        const err = new EnhancedError(`TypeOf validation failed for ${typeof def === 'string' ? def : def.moduleName}`);
        logErrorAndThrow(err, log, ec);
      }
    } else {
      if (isLoadSchema(check)) {
        // This is the least performant way by 100x...encourage user to pass a cached check function
        validationCheck = (new Validator({useNewCustomCheckerFunction: check.useNewCheckerFunction})).compile(check.validationSchema);
      } else {
        validationCheck = check;
      }
      if (isSyncCheckFunction(validationCheck)) {
        let result: true | ValidationError[];
        try {
          result = validationCheck(obj);
        } catch (err) {
          logErrorAndThrow(err, log, ec);
        }
        if (result === true) {
          return obj;
        } else {
          log.warn({def, schema: isLoadSchema(check) ? check : 'compiled', obj, result}, 'Sync validation failed.');
          const err = new Error(`Sync validation failed for ${typeof def === 'string' ? def : def.moduleName}`);
          logErrorAndThrow(err, log, ec);
        }
      } else if (isAsyncCheckFunction(validationCheck)) {
        if (ec?.throwOnAsync === true) {
          const log = new LoggerAdapter(ec, '@franzzemen/app-utility', 'load-from-module', 'validateSchema');
          const err = new Error(`Execution context throwOnAsync is true. Validation results in an async validation check`);
          logErrorAndThrow(err, log, ec);
        }
        const resultPromise: Promise<true | ValidationError[]> = validationCheck(obj);
        return resultPromise
          .then(result => {
            if (result === true) {
              return obj;
            } else {
              log.warn({
                def,
                schema: isLoadSchema(check) ? check : 'compiled',
                obj,
                result
              }, 'Async validation failed.');
              const err = new Error(`Async failed for ${typeof def === 'string' ? def : def.moduleName}`);
              logErrorAndThrow(err, log, ec);
            }
          });
      }
    }
  } else {
    return obj;
  }
}

export function loadJSONResource(relativePath, check?: LoadSchema | CheckFunction, ec?: ExecutionContextI): Object | Promise<Object> {
  const log = new LoggerAdapter(undefined, '@franzzemen/app-utility', 'load-from-module', 'loadJSONResource');
  // JSON can always be loaded dynamically with require in both commonjs and es
  const maybeJSON = requireModule(relativePath);
  if (maybeJSON) {
    // Protect from abuse
    let jsonObject;
    try {
      jsonObject = JSON.parse(JSON.stringify(maybeJSON));
    } catch (err) {
      logErrorAndThrow(err, log, ec);
    }
    return validateSchema<any>(relativePath, jsonObject, check, ec);
  } else {
    const err = new Error(`${relativePath} does not point to a JSON string`);
    logErrorAndThrow(err, log, ec);
  }
}

function loadJSONPropertyFromModule(module: any, moduleDef: ModuleDefinition, check?: CheckFunction, ec?: ExecutionContextI): Object | Promise<Object> {
  const log = new LoggerAdapter(undefined, '@franzzemen/app-utility', 'load-from-module', 'loadJSONPropertyFromModule');
  if (moduleDef.functionName) {
    const resource = objectPath.get(module, moduleDef.functionName);
    if (typeof resource === 'function') {
      const jsonAsStringOrPromise = resource();
      if (isPromise(jsonAsStringOrPromise)) {
        if (ec?.throwOnAsync === true) {
          const log = new LoggerAdapter(ec, '@franzzemen/app-utility', 'load-from-module', 'loadJSONPropertyFromModule');
          const err = new Error(`Execution context throwOnAsync is true. Function ${moduleDef.functionName} returns a Promise, which forces async processing.`);
          log.warn(moduleDef, err.message);
          logErrorAndThrow(err, log, ec);
        }
        jsonAsStringOrPromise
          .then(jsonAsString => {
            if (typeof jsonAsString === 'string') {
              const jsonObj = JSON.parse(jsonAsString);
              if (moduleDef.loadSchema || check) {
                // Always prefer the compiled validation
                if (check) {
                  return validateSchema<any>(moduleDef, jsonObj, check, ec);
                } else {
                  return validateSchema<any>(moduleDef, jsonObj, moduleDef.loadSchema, ec);
                }
              } else {
                return jsonObj;
              }
            } else {
              const err = new Error(`module function ${moduleDef.moduleName}.${moduleDef.functionName} does not return a Promise for a string`);
              logErrorAndThrow(err, log, ec);
            }
          });
      } else {
        if (typeof jsonAsStringOrPromise === 'string') {
          const jsonObj = JSON.parse(jsonAsStringOrPromise);
          if (moduleDef.loadSchema || check) {
            // Always prefer the compiled validation
            if (check) {
              return validateSchema<any>(moduleDef, jsonObj, check, ec);
            } else {
              return validateSchema<any>(moduleDef, jsonObj, moduleDef.loadSchema, ec);
            }
          } else {
            return jsonObj;
          }
        } else {
          const err = new Error(`module function ${moduleDef.moduleName}.${moduleDef.functionName} does not return a string`);
          logErrorAndThrow(err, log, ec);
        }
      }
    } else {
      const err = new Error(`module property ${moduleDef.moduleName}.${moduleDef.functionName} does not point to a function`);
      logErrorAndThrow(err, log, ec);
    }
  } else if (moduleDef.propertyName) {
    const resource = objectPath.get(module, moduleDef.propertyName);
    if (isPromise(resource)) {
      if (ec?.throwOnAsync === true) {
        const log = new LoggerAdapter(ec, '@franzzemen/app-utility', 'load-from-module', 'loadJSONPropertyFromModule');
        const err = `Execution context throwOnAsync is true. Property ${moduleDef.propertyName} is a p\Promise, which forces async processing.`;
        log.warn(moduleDef, err);
        logErrorAndThrow(new Error(err), log, ec);
      }
      resource
        .then((jsonAsString: string) => {
          if (typeof jsonAsString === 'string') {
            const jsonObj = JSON.parse(jsonAsString);
            if (moduleDef.loadSchema || check) {
              // Always prefer the compiled validation
              if (check) {
                return validateSchema<any>(moduleDef, jsonObj, check, ec);
              } else {
                return validateSchema<any>(moduleDef, jsonObj, moduleDef.loadSchema, ec);
              }
            } else {
              return jsonObj;
            }
          } else {
            const err = new Error(`module property ${moduleDef.moduleName}.${moduleDef.propertyName} does not point to a Promise for a string`);
            logErrorAndThrow(err, log, ec);
          }
        });
    } else {
      if (typeof resource === 'string') {
        const jsonObj = JSON.parse(resource);
        if (moduleDef.loadSchema || check) {
          // Always prefer the compiled validation
          if (check) {
            return validateSchema<any>(moduleDef, jsonObj, check, ec);
          } else {
            return validateSchema<any>(moduleDef, jsonObj, moduleDef.loadSchema, ec);
          }
        } else {
          return jsonObj;
        }
      } else {
        const err = new Error(`module property ${moduleDef.moduleName}.${moduleDef.propertyName} does not point to a string`);
        logErrorAndThrow(err, log, ec);
      }
    }
  } else {
    const err = new Error('Either functionName or propertyName must be defined on moduleDef');
    logErrorAndThrow(err, log, ec);
  }
}

export function loadJSONFromPackage(moduleDef: ModuleDefinition, check?: CheckFunction, ec?: ExecutionContextI): Object | Promise<Object> {
  const log = new LoggerAdapter(undefined, '@franzzemen/app-utility', 'load-from-module', 'loadJSONFromPackage');
  const functionName = moduleDef?.functionName?.trim();
  const propertyName = moduleDef?.propertyName?.trim();
  if (moduleDef?.moduleName && (functionName?.length || propertyName?.length)) {
    if (functionName?.length && propertyName?.length) {
      logErrorAndThrow(new Error(`Only one of functionName ${moduleDef.functionName} or propertyName ${moduleDef.propertyName} may be specified for module ${moduleDef.moduleName}`), log, ec);
    } else {
      if (moduleDef.moduleResolution === ModuleResolution.es) {
        if (ec?.throwOnAsync === true) {
          const err = `Execution context throwOnAsync is true.  ModuleResolution for this module is ES, which will force a dynamic import and thus async processing.`;
          log.warn(moduleDef, err);
          logErrorAndThrow(new Error(err), log, ec);
        }
        log.debug('es module resolution, forcing asynchronous result');
        return import(moduleDef.moduleName)
          .then(module => {
            return loadJSONPropertyFromModule(module, moduleDef, check, ec);
          }, err => {
            throw logErrorAndReturn(err, log, ec);
          });
      } else {
        log.debug('COMMONJS module resolution');
        let module = requireModule(moduleDef.moduleName);
        // Note...this could be a Promise if any validation is async
        return loadJSONPropertyFromModule(module, moduleDef, check, ec);
      }
    }
  } else {
    logErrorAndThrow(new Error(`moduleName [${moduleDef?.moduleName}] and either functionName [${moduleDef?.functionName}] or propertyName [${moduleDef.propertyName}] are required`), log, ec);
  }
}

function loadInstanceFromModule<T>(module: any, moduleDef: ModuleDefinition, paramsArray?: any[], check?: CheckFunction | TypeOf, ec?: ExecutionContextI, validationSchema?: ValidationSchema): Promise<T> | T {
  let t: T;
  let factoryFunctionName = moduleDef.functionName;
  if(!factoryFunctionName && !moduleDef.constructorName) {
    factoryFunctionName = 'default';
  }
  if (factoryFunctionName) {
    let factoryFunction: (...params) => T;
    factoryFunction = objectPath.get(module, factoryFunctionName);
    if (factoryFunction) {
      // Note:  Factory functions can be asynchronous
      if (paramsArray) {
        t = factoryFunction(...paramsArray);
      } else {
        t = factoryFunction();
      }
      // Factory function can return a promise
      if (isPromise(t)) {
        if (ec?.throwOnAsync === true) {
          const log = new LoggerAdapter(ec, '@franzzemen/app-utility', 'load-from-module', 'loadInstanceFromModule');
          const err = `Execution context throwOnAsync is true.  Factory function returns a Promise, which forces async processing.`;
          log.warn(moduleDef, err);
          logErrorAndThrow(new Error(err), log, ec);
        }
        return t
          .then((tt: T) => {
            if (check || moduleDef.loadSchema) {
              return validateSchema<T>(moduleDef, tt, check ? check : moduleDef.loadSchema, ec);
            } else {
              return tt;
            }
          });
      } else if (check || moduleDef.loadSchema) {
        return validateSchema<T>(moduleDef, t, check ? check : moduleDef.loadSchema, ec);
      } else {
        return t;
      }
    } else {
      const log = new LoggerAdapter(ec, '@franzzemen/app-utility', 'load-from-module', 'loadInstanceFromModule');
      const err = new Error(`moduleDef.functionName ${moduleDef.functionName} provided but does not resolve to a function`);
      logErrorAndThrow(err, log, ec);
    }
  } else if (moduleDef.constructorName) {
    // Note: Constructor functions cannot be asynchronous
    const constructorFunction = objectPath.get(module, moduleDef.constructorName);
    if (constructorFunction) {
      if (paramsArray) {
        t = new constructorFunction(...paramsArray);
      } else {
        t = new constructorFunction();
      }
      // Constructor never returns a promise
      if (check || moduleDef.loadSchema) {
        return validateSchema<T>(moduleDef, t, check ? check : moduleDef.loadSchema, ec);
      } else {
        return t;
      }
    } else {
      const log = new LoggerAdapter(ec, '@franzzemen/app-utility', 'load-from-module', 'loadInstanceFromModule');
      const err = new Error(`moduleDef.constructorName ${moduleDef.constructorName} provided but does not resolve to a constructor`);
      logErrorAndThrow(err, log, ec);
    }
  } else {
    const log = new LoggerAdapter(ec, '@franzzemen/app-utility', 'load-from-module', 'loadInstanceFromModule');
    const err = new Error(`Neither functionName nor constructorName provided`);
    logErrorAndThrow(err, log, ec);
  }
}

export function loadFromModule<T>(moduleDef: ModuleDefinition, paramsArray?: any[], check?: CheckFunction | TypeOf, ec?: ExecutionContextI): Promise<T> | T {
  const log = new LoggerAdapter(ec, '@franzzemen/app-utility', 'load-from-module', 'loadFromModule');
  try {
    /*
      It is assumed this module is transpiled with resolution es (ecmascript module) although it should work if it is
      compiled with resolution commonjs; this is because the implementation assumes a dynamic import for anything but
      commonjs, which is consistent with both resolutions.
     */
    if (moduleDef.moduleResolution === ModuleResolution.es) {
      if (ec?.throwOnAsync === true) {
        const err = `Execution context throwOnAsync is true.  ModuleResolution for this module is ES, which will force a dynamic import and thus async processing.`;
        log.warn(moduleDef, err);
        logErrorAndThrow(new EnhancedError(err), log, ec);
      }
      log.debug('es module resolution, forcing asynchronous result');
      return import(moduleDef.moduleName)
        .then(module => {
          return loadInstanceFromModule<T>(module, moduleDef, paramsArray, check, ec);
        }, err => {
          throw logErrorAndReturn(err, log, ec);
        });
    } else {
      log.debug('commonjs module resolution');
      const module = requireModule(moduleDef.moduleName);
      if(!module) {
        const err = new Error(`No module for ${moduleDef.moduleName}`);
        logErrorAndThrow(err, log, ec);
      }
      return loadInstanceFromModule<T>(module, moduleDef, paramsArray, check, ec);
    }
  } catch (err) {
    logErrorAndThrow(err, log, ec);
  }
}

