import Validator, {ValidationError, ValidationSchema, SyncCheckFunction, AsyncCheckFunction} from 'fastest-validator';
import {createRequire} from 'node:module';
import {isPromise} from 'util/types';
import {ExecutionContextI} from './execution-context.js';
import {
  CheckFunction,
  isAsyncCheckFunction,
  isSyncCheckFunction,
  isLoadSchema
} from './fastest-validator-util.js';
import {LoggerAdapter} from './log/index.js';

/**
 * NOTE NOTE NOTE:  By definition this needs to be in the root of the package as relative loads expect it
 * @param moduleName
 */

const requireModule = createRequire(import.meta.url);

export enum ModuleResolution {
  'commonjs',
  'es'
}

export interface LoadSchema {
  validationSchema: ValidationSchema;
  useNewCheckerFunction: boolean;
}

export type ModuleDefinition = {
  moduleName: string,
  functionName?: string,
  constructorName?: string,
  propertyName?: string,
  moduleResolution?: ModuleResolution,
  loadSchema?: LoadSchema
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


function validateSchema<T>(def: string | ModuleDefinition, obj, check: LoadSchema | CheckFunction, ec?: ExecutionContextI): T | Promise<T> {
  const log = new LoggerAdapter(undefined, '@franzzemen/app-utility', 'load-from-module', 'validationCheck');
  let validationCheck: CheckFunction;
  if(check) {
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
        log.error(err);
        throw err;
      }
      if (result === true) {
        return obj;
      } else {
        log.warn({def, schema: isLoadSchema(check) ? check : 'compiled'}, 'Sync validation failed.');
        const err = new Error(`Sync validation failed for ${typeof def === 'string' ? def : def.moduleName}`);
        log.error(err);
        throw err;
      }
    } else if (isAsyncCheckFunction(validationCheck)) {
      const resultPromise: Promise<true | ValidationError[]> = validationCheck(obj);
      return resultPromise
        .then(result => {
          if (result === true) {
            return obj;
          } else {
            log.warn({def, schema: isLoadSchema(check) ? check : 'compiled', obj, result}, 'Async validation failed.');
            const err = new Error(`Async failed for ${typeof def === 'string' ? def : def.moduleName}`);
            log.error(err);
            throw err;
          }
        }, err => {
          log.error(err);
          throw err;
        });
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
      log.error(err);
      throw err;
    }
    return validateSchema<any>(relativePath, jsonObject, check, ec);
  } else {
    throw new Error(`module path ${relativePath} resolves to undefined`);
  }
}

function loadJSONPropertyFromModule(module: any, moduleDef: ModuleDefinition, check?: CheckFunction, ec?: ExecutionContextI): Object | Promise<Object> {
  const log = new LoggerAdapter(undefined, '@franzzemen/app-utility', 'load-from-module', 'loadJSONPropertyFromModule');
  if (!moduleDef.functionName && !moduleDef.propertyName) {
    const err = new Error('Either functionName or propertyName must be defined on moduleDef');
    log.error(err);
    throw err;
  }
  const resourceName = moduleDef.functionName?.length ? moduleDef.functionName.trim() : moduleDef.propertyName.trim();
  const resource = module[resourceName];
  if (resource) {
    let jsonAsString: string;
    if (typeof resource === 'function' && moduleDef.functionName?.length > 0) {
      jsonAsString = resource();
    } else if (typeof resource === 'string' && moduleDef.propertyName?.length > 0) {
      jsonAsString = resource;
    } else {
      throw new Error(`Mismatch between mdoule ${moduleDef.moduleName} resource type and function ${moduleDef.functionName} or property ${moduleDef.functionName}.  It is possible that a property was specified for a function or vice versa, or the module doesn't support the request`);
    }
    if (typeof jsonAsString === 'string') {
      const jsonObj = JSON.parse(jsonAsString); // Always expect strings in order to protect from abuse
      if(moduleDef.loadSchema || check) {
        // Always prefer the compiled validation
        if(check) {
          return validateSchema<any>(moduleDef, jsonObj, check, ec);
        } else {
          return validateSchema<any>(moduleDef, jsonObj, moduleDef.loadSchema, ec);
        }
      } else {
        return jsonObj;
      }
    } else {
      throw new Error(`Value for module ${moduleDef.moduleName}, function invocation ${moduleDef.functionName} or property ${moduleDef.propertyName} is not a string`);
    }
  } else {
    throw new Error(`No function or property for module ${moduleDef.moduleName}, function ${moduleDef.functionName}, property ${moduleDef.propertyName}`);
  }
}

export function loadJSONFromPackage(moduleDef: ModuleDefinition, check?: CheckFunction, ec?: ExecutionContextI): Object | Promise<Object> {
  const log = new LoggerAdapter(undefined, '@franzzemen/app-utility', 'load-from-module', 'loadJSONFromPackage');
  const functionName = moduleDef?.functionName?.trim();
  const propertyName = moduleDef?.propertyName?.trim();
  if (moduleDef?.moduleName && (functionName?.length || propertyName?.length)) {
    if (functionName?.length && propertyName?.length) {
      throw new Error(`Only one of functionName ${moduleDef.functionName} or propertyName ${moduleDef.propertyName} may be specified for module ${moduleDef.moduleName}`);
    } else {
      if (moduleDef.moduleResolution === ModuleResolution.es) {
        log.debug('es module resolution, forcing asynchronous result');
        return import(moduleDef.moduleName)
          .then(module => {
            return loadJSONPropertyFromModule(module, moduleDef, check, ec);
          });
      } else {
        log.debug('COMMONJS module resolution');
        let module = requireModule(moduleDef.moduleName);
        // Note...this could be a Promise if any validation is async
        return loadJSONPropertyFromModule(module, moduleDef, check, ec);
      }
    }
  } else {
    throw new Error(`moduleName [${moduleDef?.moduleName}] and either functionName [${moduleDef?.functionName}] or propertyName [${moduleDef.propertyName}] are required`);
  }
}

function loadInstanceFromModule<T>(module: any, moduleDef: ModuleDefinition, paramsArray?: any[], check?: CheckFunction, ec?: ExecutionContextI, validationSchema?: ValidationSchema): Promise<T> | T {
  let t: T;
  if (moduleDef.functionName || moduleDef.constructorName === undefined) {
    let factoryFunction: (...params) => T;
    const factoryFunctionName = moduleDef.functionName ? moduleDef.functionName : 'default';
    factoryFunction = module[factoryFunctionName];
    if (factoryFunction) {
      if(paramsArray) {
        t = factoryFunction(...paramsArray);
      } else {
        t = factoryFunction();
      }
    }
  } else {
    if(paramsArray) {
      t = new module[moduleDef.constructorName](...paramsArray);
    } else {
      t = new module[moduleDef.constructorName]();
    }
  }
  if(check) {
    return validateSchema<T>(moduleDef, t, check, ec);
  } else {
    return t;
  }
}

export function loadFromModule<T>(moduleDef: ModuleDefinition, paramsArray?: any[], check?: CheckFunction, ec?: ExecutionContextI): Promise<T> | T {
  const log = new LoggerAdapter(undefined, '@franzzemen/app-utility', 'load-from-module', 'loadFromModule');
  try {
    /*
      It is assumed this module is transpiled with resolution es (ecmascript module) although it should work if it is
      compiled with resolution commonjs; this is because the implementation assumes a dynamic import for anything but
      commonjs, which is consistent with both resolutions.
     */
    if (moduleDef.moduleResolution === ModuleResolution.es) {
      log.debug('es module resolution, forcing asynchronous result');
      return import(moduleDef.moduleName)
        .then(module => {
          return loadInstanceFromModule<T>(module, moduleDef, paramsArray, check, ec);
        }, err => {
          log.error(err);
          throw err;
        });
    } else {
      log.debug('commonjs module resolution');
      const module = requireModule(moduleDef.moduleName);
      return loadInstanceFromModule<T>(module, moduleDef, paramsArray, check, ec);
    }
  } catch (err) {
    console.error(err);
    throw err;
  }
}
