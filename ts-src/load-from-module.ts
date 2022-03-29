/**
 * NOTE NOTE NOTE:  By definition this needs to be in the root of the package as relative loads expect it
 * @param moduleName
 */
declare function require<T>(moduleName: string): any;

export type ModuleDefinition = {moduleName: string, functionName?: string, constructorName?: string, propertyName?:string};

export function isModuleDefinition(module: any | ModuleDefinition): module is ModuleDefinition {
  const moduleNameExists = 'moduleName' in module;
  const functionNameExists = 'functionName' in module;
  const constructorNameExists = 'constructorName' in module;
  const propertyNameExists = 'propertyName' in module;
  return moduleNameExists // moduleName must always be present
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

export function loadJSONResource(relativePath): Object {
  try {
    return require(relativePath);
  } catch (err) {
    console.error(err);
    throw err;
  }
}

export function loadJSONFromPackage(moduleDef: ModuleDefinition): Object {
  const functionName = moduleDef?.functionName?.trim();
  const propertyName = moduleDef?.propertyName?.trim();
  if(moduleDef?.moduleName && (functionName?.length || propertyName?.length)) {
    if(functionName?.length && propertyName?.length) {
      throw new Error(`Only one of functionName ${moduleDef.functionName} or propertyName ${moduleDef.propertyName} may be specified for module ${moduleDef.moduleName}`);
    } else {
      let jsonAsString: string;
      const module = require(moduleDef.moduleName);
      const resourceName = functionName?.length ? functionName : propertyName;
      const resource = module[resourceName];
      if(resource) {
        if (typeof resource === 'function' && functionName?.length > 0) {
          jsonAsString = resource();
        } else if(typeof resource === 'string' && propertyName?.length > 0) {
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
        throw new Error (`No function or property for module ${moduleDef.moduleName}, function ${moduleDef.functionName}, property ${moduleDef.propertyName}`);
      }
    }
  } else {
    throw new Error(`moduleName [${moduleDef?.moduleName}] and either functionName [${moduleDef?.functionName}] or propertyName [${moduleDef.propertyName}] are required`);
  }
}

export function loadFromModule<T>(moduleDef: ModuleDefinition, paramsArray?: any[]): T {
  // First check if T is a path or an installed module
  // If it looks like an installed module, try and load it
  // If the installed module doesn't load, or it looks like a path, load using the path.  Note that the path must be relative to the
  // top of the rules engine package...so from here should be '../' plus the relative path from there...
  // The package must export default a function hat returns the intended type (providing opportunities for the function implementation to  create a newNo instance etc.
  try {
    const module = require<T>(moduleDef.moduleName);
    if(moduleDef.functionName || moduleDef.constructorName === undefined)  {
      let factoryFunction: (...params) => T;
      const factoryFunctionName = moduleDef.functionName ? moduleDef.functionName : 'default';
      factoryFunction = module[factoryFunctionName];
      if (factoryFunction) {
        return factoryFunction(paramsArray);
      }
    } else {
      return new module[moduleDef.constructorName](paramsArray);
    }
  } catch (err) {
    console.error (err);
    throw err;
  }
}
