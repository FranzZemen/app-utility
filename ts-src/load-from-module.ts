import {createRequire} from 'node:module';
import {ExecutionContextI} from './execution-context.js';
import {LoggerAdapter} from './log/index.js';
/**
 * NOTE NOTE NOTE:  By definition this needs to be in the root of the package as relative loads expect it
 * @param moduleName
 */

const requireModule = createRequire(import.meta.url);

export enum ModuleResolution {
  "commonjs",
  "es"
}

export type ModuleDefinition = {moduleName: string, functionName?: string, constructorName?: string, propertyName?:string, moduleResolution?: ModuleResolution};

export function isModuleDefinition(module: any | ModuleDefinition): module is ModuleDefinition {
  const moduleNameExists = 'moduleName' in module;
  const functionNameExists = 'functionName' in module;
  const constructorNameExists = 'constructorName' in module;
  const propertyNameExists = 'propertyName' in module;
  const moduleResolutionExists = 'moduleResolution' in module;
  return moduleNameExists  // moduleName must always be present
    && ((!functionNameExists && !constructorNameExists && !propertyNameExists) // None of the constraints are present
      ||  (functionNameExists && !(constructorNameExists || propertyNameExists)) // functionName is present but not the other two
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
}

export function loadJSONResource(relativePath, ec?: ExecutionContextI): Object {
  try {
    // JSON can always be loaded dynamically with require in both commonjs and es
    return requireModule(relativePath);
  } catch (err) {
    console.error(err);
    throw err;
  }
}

function loadJSONPropertyFromModule(module: any, moduleDef: ModuleDefinition, ec?: ExecutionContextI): Object {
  const log = new LoggerAdapter(undefined, '@franzzemen/app-utility', 'load-from-module', 'loadJSONPropertyFromModule');
  if(!moduleDef.functionName && !moduleDef.propertyName) {
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
      return JSON.parse(jsonAsString); // Throws if error
    } else {
      throw new Error(`Value for module ${moduleDef.moduleName}, function invocation ${moduleDef.functionName} or property ${moduleDef.propertyName} is not a string`);
    }
  } else {
    throw new Error(`No function or property for module ${moduleDef.moduleName}, function ${moduleDef.functionName}, property ${moduleDef.propertyName}`);
  }
}

export function loadJSONFromPackage(moduleDef: ModuleDefinition, ec?: ExecutionContextI): Object | Promise<Object> {
  const log = new LoggerAdapter(undefined, '@franzzemen/app-utility', 'load-from-module', 'loadJSONFromPackage');
  const functionName = moduleDef?.functionName?.trim();
  const propertyName = moduleDef?.propertyName?.trim();
  if(moduleDef?.moduleName && (functionName?.length || propertyName?.length)) {
    if(functionName?.length && propertyName?.length) {
      throw new Error(`Only one of functionName ${moduleDef.functionName} or propertyName ${moduleDef.propertyName} may be specified for module ${moduleDef.moduleName}`);
    } else {
      if(moduleDef.moduleResolution === ModuleResolution.es) {
        log.debug('es module resolution, forcing asynchronous result');
        return import(moduleDef.moduleName)
          .then(module => {
            return loadJSONPropertyFromModule (module,moduleDef, ec);
          })
      } else {
        log.debug('COMMONJS module resolution');
        let module = requireModule(moduleDef.moduleName);
        return loadJSONPropertyFromModule (module,moduleDef, ec);
      }
    }
  } else {
    throw new Error(`moduleName [${moduleDef?.moduleName}] and either functionName [${moduleDef?.functionName}] or propertyName [${moduleDef.propertyName}] are required`);
  }
}

function loadInstanceFromModule<T> (module: any, moduleDef: ModuleDefinition, paramsArray?: any[], ec?: ExecutionContextI): T {
  if (moduleDef.functionName || moduleDef.constructorName === undefined) {
    let factoryFunction: (...params) => T;
    const factoryFunctionName = moduleDef.functionName ? moduleDef.functionName : 'default';
    factoryFunction = module[factoryFunctionName];
    if (factoryFunction) {
      return factoryFunction(paramsArray);
    }
  } else {
    return new module[moduleDef.constructorName](paramsArray);
  }
}

export function loadFromModule<T>(moduleDef: ModuleDefinition, paramsArray?: any[], ec?: ExecutionContextI): Promise<T> | T {
  const log = new LoggerAdapter(undefined, '@franzzemen/app-utility', 'load-from-module', 'loadFromModule');
  try {
    /*
      It is assumed this module is transpiled with resolution es (ecmascript module) although it should work if it is
      compiled with resolution commonjs; this is because the implementation assumes a dynamic import for anything but
      commonjs, which is consistent with both resolutions.
     */
    if(moduleDef.moduleResolution === ModuleResolution.es) {
      log.debug('es module resolution, forcing asynchronous result');
      return import(moduleDef.moduleName)
        .then(module => {
          return loadInstanceFromModule<T>(module, moduleDef, paramsArray, ec);
        }, err => {
          log.error(err);
          throw err;
        });
    } else {
      log.debug('commonjs module resolution');
      const module = requireModule(moduleDef.moduleName);
      return loadInstanceFromModule<T>(module, moduleDef, paramsArray, ec);
    }
  } catch (err) {
    console.error (err);
    throw err;
  }
}
