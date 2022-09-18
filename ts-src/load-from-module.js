import Validator from 'fastest-validator';
import { createRequire } from 'node:module';
import { isPromise } from 'util/types';
import { EnhancedError, logErrorAndReturn, logErrorAndThrow } from './enhanced-error.js';
import { isAsyncCheckFunction, isLoadSchema, isSyncCheckFunction } from './fastest-validator-util.js';
import { LoggerAdapter } from './log/index.js';
const requireModule = createRequire(import.meta.url);
const objectPath = requireModule('object-path');
export var ModuleResolution;
(function (ModuleResolution) {
    ModuleResolution["commonjs"] = "commonjs";
    ModuleResolution["es"] = "es";
    ModuleResolution["json"] = "json";
})(ModuleResolution || (ModuleResolution = {}));
export class TypeOf extends Set {
    constructor(typeOf, ec) {
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
        }
        else {
            logErrorAndThrow(new EnhancedError('Attempt to initialize TypeOf with value not compatible with operator "typeof"'), new LoggerAdapter(ec, 'app-utility', 'load-from-module', 'TypeOf constructor'), ec);
        }
    }
    get typeOf() {
        return this._typeOf;
    }
    add(value) {
        throw new Error('TypeOf implementation of Set is immutable');
    }
    clear() {
        throw new Error('TypeOf implementation of Set is immutable');
    }
    delete(value) {
        throw new Error('TypeOf implementation of Set is immutable');
    }
}
TypeOf.String = new TypeOf('string');
TypeOf.Number = new TypeOf('number');
TypeOf.Boolean = new TypeOf('boolean');
TypeOf.BigInt = new TypeOf('bigint');
TypeOf.Function = new TypeOf('function');
TypeOf.Symbol = new TypeOf('symbol');
TypeOf.Object = new TypeOf('object');
export function isTypeOf(typeOf) {
    return typeOf instanceof TypeOf;
}
export function isModuleDefinition(module) {
    const moduleNameExists = 'moduleName' in module;
    const functionNameExists = 'functionName' in module;
    const constructorNameExists = 'constructorName' in module;
    const propertyNameExists = 'propertyName' in module;
    const moduleResolutionExists = 'moduleResolution' in module;
    return moduleNameExists
        && ((!functionNameExists && !constructorNameExists && !propertyNameExists)
            || (functionNameExists && !(constructorNameExists || propertyNameExists))
            || (constructorNameExists && !(functionNameExists || propertyNameExists))
            || (propertyNameExists && !(functionNameExists || constructorNameExists)));
}
export function isConstrainedModuleDefinition(module) {
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
function validateSchema(moduleName, moduleDef, obj, ec) {
    const log = new LoggerAdapter(undefined, '@franzzemen/app-utility', 'load-from-module', 'validationCheck');
    let validationCheck;
    if (moduleDef.loadSchema) {
        if (isTypeOf(moduleDef.loadSchema)) {
            if (typeof obj === moduleDef.loadSchema.typeOf) {
                return obj;
            }
            else {
                const result = [{
                        actual: typeof obj,
                        expected: moduleDef.loadSchema.typeOf,
                        field: 'n/a',
                        message: `returned instance failed 'typeof instance === "${moduleDef.loadSchema.typeOf}"'`,
                        type: 'n/a'
                    }];
                log.warn({ moduleDef, moduleName, schema: 'TypeOf', obj, result }, 'TypeOf validation failed.');
                const err = new EnhancedError(`TypeOf validation failed for ${moduleName}`);
                logErrorAndThrow(err, log, ec);
            }
        }
        else {
            if (isLoadSchema(moduleDef.loadSchema)) {
                validationCheck = (new Validator({ useNewCustomCheckerFunction: moduleDef.loadSchema.useNewCheckerFunction })).compile(moduleDef.loadSchema.validationSchema);
            }
            else {
                validationCheck = moduleDef.loadSchema;
            }
            if (isSyncCheckFunction(validationCheck)) {
                let result;
                try {
                    result = validationCheck(obj);
                }
                catch (err) {
                    logErrorAndThrow(err, log, ec);
                }
                if (result === true) {
                    return obj;
                }
                else {
                    log.warn({ moduleDef, moduleName, schema: isLoadSchema(moduleDef.loadSchema) ? moduleDef.loadSchema : 'compiled', obj, result }, 'Sync validation failed.');
                    const err = new Error(`Sync validation failed for ${moduleName}`);
                    logErrorAndThrow(err, log, ec);
                }
            }
            else if (isAsyncCheckFunction(validationCheck)) {
                if (ec?.throwOnAsync === true) {
                    const log = new LoggerAdapter(ec, '@franzzemen/app-utility', 'load-from-module', 'validateSchema');
                    const err = new Error(`Execution context throwOnAsync is true. Validation results in an async validation check`);
                    logErrorAndThrow(err, log, ec);
                }
                const resultPromise = validationCheck(obj);
                return resultPromise
                    .then(result => {
                    if (result === true) {
                        return obj;
                    }
                    else {
                        log.warn({
                            moduleDef,
                            moduleName,
                            schema: isLoadSchema(moduleDef.loadSchema) ? moduleDef.loadSchema : 'compiled',
                            obj,
                            result
                        }, 'Async validation failed.');
                        const err = new Error(`Async failed for ${moduleName}`);
                        logErrorAndThrow(err, log, ec);
                    }
                });
            }
        }
    }
    else {
        return obj;
    }
}
export function loadJSONResource(relativePath, check, ec) {
    const log = new LoggerAdapter(undefined, '@franzzemen/app-utility', 'load-from-module', 'loadJSONResource');
    const maybeJSON = requireModule(relativePath);
    if (maybeJSON) {
        let jsonObject;
        try {
            jsonObject = JSON.parse(JSON.stringify(maybeJSON));
        }
        catch (err) {
            logErrorAndThrow(err, log, ec);
        }
        return validateSchema(relativePath, { moduleName: relativePath, loadSchema: check, moduleResolution: ModuleResolution.json }, jsonObject, ec);
    }
    else {
        const err = new Error(`${relativePath} does not point to a JSON string`);
        logErrorAndThrow(err, log, ec);
    }
}
function loadJSONPropertyFromModule(module, moduleDef, ec) {
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
                        if (moduleDef.loadSchema) {
                            return validateSchema(moduleDef.moduleName, moduleDef, jsonObj, ec);
                        }
                        else {
                            return jsonObj;
                        }
                    }
                    else {
                        const err = new Error(`module function ${moduleDef.moduleName}.${moduleDef.functionName} does not return a Promise for a string`);
                        logErrorAndThrow(err, log, ec);
                    }
                });
            }
            else {
                if (typeof jsonAsStringOrPromise === 'string') {
                    const jsonObj = JSON.parse(jsonAsStringOrPromise);
                    if (moduleDef.loadSchema) {
                        return validateSchema(moduleDef.moduleName, moduleDef, jsonObj, ec);
                    }
                    else {
                        return jsonObj;
                    }
                }
                else {
                    const err = new Error(`module function ${moduleDef.moduleName}.${moduleDef.functionName} does not return a string`);
                    logErrorAndThrow(err, log, ec);
                }
            }
        }
        else {
            const err = new Error(`module property ${moduleDef.moduleName}.${moduleDef.functionName} does not point to a function`);
            logErrorAndThrow(err, log, ec);
        }
    }
    else if (moduleDef.propertyName) {
        const resource = objectPath.get(module, moduleDef.propertyName);
        if (isPromise(resource)) {
            if (ec?.throwOnAsync === true) {
                const log = new LoggerAdapter(ec, '@franzzemen/app-utility', 'load-from-module', 'loadJSONPropertyFromModule');
                const err = `Execution context throwOnAsync is true. Property ${moduleDef.propertyName} is a p\Promise, which forces async processing.`;
                log.warn(moduleDef, err);
                logErrorAndThrow(new Error(err), log, ec);
            }
            resource
                .then((jsonAsString) => {
                if (typeof jsonAsString === 'string') {
                    const jsonObj = JSON.parse(jsonAsString);
                    if (moduleDef.loadSchema) {
                        return validateSchema(moduleDef.moduleName, moduleDef, jsonObj, ec);
                    }
                    else {
                        return jsonObj;
                    }
                }
                else {
                    const err = new Error(`module property ${moduleDef.moduleName}.${moduleDef.propertyName} does not point to a Promise for a string`);
                    logErrorAndThrow(err, log, ec);
                }
            });
        }
        else {
            if (typeof resource === 'string') {
                const jsonObj = JSON.parse(resource);
                if (moduleDef.loadSchema) {
                    return validateSchema(moduleDef.moduleName, moduleDef, jsonObj, ec);
                }
                else {
                    return jsonObj;
                }
            }
            else {
                const err = new Error(`module property ${moduleDef.moduleName}.${moduleDef.propertyName} does not point to a string`);
                logErrorAndThrow(err, log, ec);
            }
        }
    }
    else {
        const err = new Error('Either functionName or propertyName must be defined on moduleDef');
        logErrorAndThrow(err, log, ec);
    }
}
export function loadJSONFromPackage(moduleDef, ec) {
    const log = new LoggerAdapter(undefined, '@franzzemen/app-utility', 'load-from-module', 'loadJSONFromPackage');
    const functionName = moduleDef?.functionName?.trim();
    const propertyName = moduleDef?.propertyName?.trim();
    if (moduleDef?.moduleName && (functionName?.length || propertyName?.length)) {
        if (functionName?.length && propertyName?.length) {
            logErrorAndThrow(new Error(`Only one of functionName ${moduleDef.functionName} or propertyName ${moduleDef.propertyName} may be specified for module ${moduleDef.moduleName}`), log, ec);
        }
        else {
            if (moduleDef.moduleResolution === ModuleResolution.es) {
                if (ec?.throwOnAsync === true) {
                    const err = `Execution context throwOnAsync is true.  ModuleResolution for this module is ES, which will force a dynamic import and thus async processing.`;
                    log.warn(moduleDef, err);
                    logErrorAndThrow(new Error(err), log, ec);
                }
                log.debug('es module resolution, forcing asynchronous result');
                return import(moduleDef.moduleName)
                    .then(module => {
                    return loadJSONPropertyFromModule(module, moduleDef, ec);
                }, err => {
                    throw logErrorAndReturn(err, log, ec);
                });
            }
            else {
                log.debug('COMMONJS module resolution');
                let module = requireModule(moduleDef.moduleName);
                return loadJSONPropertyFromModule(module, moduleDef, ec);
            }
        }
    }
    else {
        logErrorAndThrow(new Error(`moduleName [${moduleDef?.moduleName}] and either functionName [${moduleDef?.functionName}] or propertyName [${moduleDef.propertyName}] are required`), log, ec);
    }
}
function loadInstanceFromModule(module, moduleDef, ec) {
    let t;
    let factoryFunctionName = moduleDef.functionName;
    if (!factoryFunctionName && !moduleDef.constructorName) {
        factoryFunctionName = 'default';
    }
    if (factoryFunctionName) {
        let factoryFunction;
        factoryFunction = objectPath.get(module, factoryFunctionName);
        if (factoryFunction) {
            if (moduleDef.paramsArray) {
                t = factoryFunction(...moduleDef.paramsArray);
            }
            else {
                t = factoryFunction();
            }
            if (isPromise(t)) {
                if (ec?.throwOnAsync === true) {
                    const log = new LoggerAdapter(ec, '@franzzemen/app-utility', 'load-from-module', 'loadInstanceFromModule');
                    const err = `Execution context throwOnAsync is true.  Factory function returns a Promise, which forces async processing.`;
                    log.warn(moduleDef, err);
                    logErrorAndThrow(new Error(err), log, ec);
                }
                return t
                    .then((tt) => {
                    return validateSchema(moduleDef.moduleName, moduleDef, tt, ec);
                });
            }
            else {
                return validateSchema(moduleDef.moduleName, moduleDef, t, ec);
            }
        }
        else {
            const log = new LoggerAdapter(ec, '@franzzemen/app-utility', 'load-from-module', 'loadInstanceFromModule');
            const err = new Error(`moduleDef.functionName ${moduleDef.functionName} provided but does not resolve to a function`);
            logErrorAndThrow(err, log, ec);
        }
    }
    else if (moduleDef.constructorName) {
        const constructorFunction = objectPath.get(module, moduleDef.constructorName);
        if (constructorFunction) {
            if (moduleDef.paramsArray) {
                t = new constructorFunction(...moduleDef.paramsArray);
            }
            else {
                t = new constructorFunction();
            }
            return validateSchema(moduleDef.moduleName, moduleDef, t, ec);
        }
        else {
            const log = new LoggerAdapter(ec, '@franzzemen/app-utility', 'load-from-module', 'loadInstanceFromModule');
            const err = new Error(`moduleDef.constructorName ${moduleDef.constructorName} provided but does not resolve to a constructor`);
            logErrorAndThrow(err, log, ec);
        }
    }
    else {
        const log = new LoggerAdapter(ec, '@franzzemen/app-utility', 'load-from-module', 'loadInstanceFromModule');
        const err = new Error(`Neither functionName nor constructorName provided`);
        logErrorAndThrow(err, log, ec);
    }
}
export function loadFromModule(moduleDef, ec) {
    const log = new LoggerAdapter(ec, '@franzzemen/app-utility', 'load-from-module', 'loadFromModule');
    try {
        if (moduleDef.moduleResolution === ModuleResolution.es) {
            if (ec?.throwOnAsync === true) {
                const err = `Execution context throwOnAsync is true.  ModuleResolution for this module is ES, which will force a dynamic import and thus async processing.`;
                log.warn(moduleDef, err);
                logErrorAndThrow(new EnhancedError(err), log, ec);
            }
            log.debug('es module resolution, forcing asynchronous result');
            return import(moduleDef.moduleName)
                .then(module => {
                return loadInstanceFromModule(module, moduleDef, ec);
            }, err => {
                throw logErrorAndReturn(err, log, ec);
            });
        }
        else {
            log.debug('commonjs module resolution');
            const module = requireModule(moduleDef.moduleName);
            if (!module) {
                const err = new Error(`No module for ${moduleDef.moduleName}`);
                logErrorAndThrow(err, log, ec);
            }
            return loadInstanceFromModule(module, moduleDef, ec);
        }
    }
    catch (err) {
        logErrorAndThrow(err, log, ec);
    }
}
//# sourceMappingURL=load-from-module.js.map