import {isPromise} from 'util/types';
import {EnhancedError, logErrorAndReturn, logErrorAndThrow} from './enhanced-error.js';
import {ExecutionContextI} from './execution-context.js';
import {loadJSONFromPackage, loadJSONResource, ModuleDefinition, ModuleResolution} from './load-from-module.js';
import {LoggerAdapter} from './log/index.js';
import {LoadPackageType, ModuleResolutionSetter, ModuleResolver} from './module-resolver.js';

export type Fragment = { frag: string, start: number, end?: number }

export class Hints extends Map<string, string | Object> {
  hintBody: string;
  initialized = false;


  // For use by ModuleResolver
  setHint: ModuleResolutionSetter = (key: string, value: any, ec?: ExecutionContextI) => {
    super.set(key, value);
    return true;
  }

  constructor(hintBody: string, ec?: ExecutionContextI) {
    super();
    const log = new LoggerAdapter(ec, 'app-utility', 'hints', 'constructor');
    if (hintBody === undefined) {
      logErrorAndThrow(new EnhancedError('Undefined hint body'));
    }
    this.hintBody = hintBody.trim();
  }

  public loadAndInitialize(ec?: ExecutionContextI): Hints | Promise<Hints> {
    const log = new LoggerAdapter(ec, 'app-utility', 'hints', 'loadAndInitialize');
    // Locate name, value pairs with JSON
    let nvRegex = /([a-z0-9]+[-a-z0-9]*[a-z0-9]+)[\s\t\r\n\v\f\u2028\u2029]*=[\s\t\r\n\v\f\u2028\u2029]*([\[{][^]*[}|\]])/g;
    let match = undefined;
    let matchBoundaries: { start: number, end: number }[] = [];
    while ((match = nvRegex.exec(this.hintBody)) !== null) {
      const jsonStr = match[2].trim();
      try {
        const json = JSON.parse(jsonStr);
        super.set(match[1], json);
      } catch (err) {
        const error = new EnhancedError(`Cannot parse JSON hint ${jsonStr}`);
        log.error(err);
        logErrorAndThrow(error, log, ec);
      }
      matchBoundaries.unshift({start: match.index, end: nvRegex.lastIndex});
    }
    // Build a new string removing prior results, which are sorted in reverse index
    let hintsCopy = this.hintBody;
    matchBoundaries.forEach(boundary => {
      hintsCopy = hintsCopy.substring(0, boundary.start) + hintsCopy.substring(boundary.end);
    });

    // Locate name, JSON from relative files
    nvRegex = /([a-z0-9]+[-a-z0-9]*[a-z0-9]+)[\s\t\r\n\v\f\u2028\u2029]*=[\s\t\r\n\v\f\u2028\u2029]*@\(require:([a-zA-Z0-9 ./\\-_]+\.json)\)/g;
    match = undefined;
    matchBoundaries = [];
    while ((match = nvRegex.exec(hintsCopy)) !== null) {
      const resource = match[2].trim();
      try {
        const moduleDef: ModuleDefinition = {
          moduleName: resource,
          moduleResolution: ModuleResolution.json
        };
        const json = loadJSONResource(moduleDef, ec);
        if (isPromise(json)) {
          // It shouldn't be returning a promise.  If that ever changes, then follow the same pattern as for module definitions; we want to
          // parse synchronously
          logErrorAndThrow(new EnhancedError('Should not be returning a promise as we do not provide a check function'), log, ec);
        }
        super.set(match[1], json);
      } catch (err) {
        const error = new Error(`Cannot load JSON from relative path ${resource}`);
        log.error(err);
        logErrorAndThrow(error, log, ec);
      }
      matchBoundaries.unshift({start: match.index, end: nvRegex.lastIndex});
    }
    // Build a new string removing prior results, which are sorted in reverse index
    matchBoundaries.forEach(boundary => {
      hintsCopy = hintsCopy.substring(0, boundary.start) + hintsCopy.substring(boundary.end);
    });

    // Locate name, value pairs with quotes
    nvRegex = /([a-z0-9]+[-a-z0-9]*[a-z0-9]+)[\s\t\r\n\v\f\u2028\u2029]*=[\s\t\r\n\v\f\u2028\u2029]*"([.\/\-_a-zA-Z0-9\s\t\r\n\v\f\u2028\u2029]+)"/g;
    const fragments: Fragment[] = [];
    match = undefined;
    matchBoundaries = [];
    while ((match = nvRegex.exec(hintsCopy)) !== null) {
      super.set(match[1], match[2].trim());
      matchBoundaries.unshift({start: match.index, end: nvRegex.lastIndex});
    }
    // Build a new string removing prior results, which are sorted in reverse index
    matchBoundaries.forEach(boundary => {
      hintsCopy = hintsCopy.substring(0, boundary.start) + hintsCopy.substring(boundary.end);
    });

    // Locate name, value pairs without quotes
    nvRegex = /([a-z0-9]+[-a-z0-9]*[a-z0-9]+)[\s\t\r\n\v\f\u2028\u2029]*=[\s\t\r\n\v\f\u2028\u2029]*([.\/\-_a-zA-Z0-9]+)/g;
    match = undefined;
    matchBoundaries = [];
    while ((match = nvRegex.exec(hintsCopy)) !== null) {
      super.set(match[1], match[2]);
      matchBoundaries.unshift({start: match.index, end: nvRegex.lastIndex});
    }
    matchBoundaries.forEach(boundary => {
      hintsCopy = hintsCopy.substring(0, boundary.start) + hintsCopy.substring(boundary.end);
    });

    // Locate name, JSON from package/functions/attributes. Only creates the module definition.  Does not load the JSON inline for ES modules
    nvRegex = /([a-z0-9]+[-a-z0-9]*[a-z0-9]+)[\s\t\r\n\v\f\u2028\u2029]*=[\s\t\r\n\v\f\u2028\u2029]*@\((require|import):([a-zA-Z0-9 @./\\-_]+)(:|=>)([a-zA-Z0-9_.\[\]"']+)\)/g;
    match = undefined;
    matchBoundaries = [];
//    let jsonLoads: { key: string, moduleDef: ModuleDefinition }[] = [];
//    let asyncLoads = false;
    const moduleResolver = new ModuleResolver();
    while ((match = nvRegex.exec(hintsCopy)) !== null) {
      const key = match[1].trim();
      const importStatement = match[2].trim();
      let moduleResolution = ModuleResolution.commonjs;
      if (importStatement === 'import') {
        moduleResolution = ModuleResolution.es;
//        asyncLoads = true;
      }
      const moduleName = match[3].trim();
      const attribOrFunction = match[4].trim();
      let functionName: string, propertyName: string;
      if (attribOrFunction === ':') {
        propertyName = match[5].trim();
      } else {
        functionName = match[5].trim();
      }
      moduleResolver.add({
        refName: key,
        module: {
          moduleName,
          functionName,
          propertyName,
          moduleResolution
        },
        loadPackageType: LoadPackageType.json,
        ownerIsObject: true,
        ownerThis: this,
        ownerSetter: 'setHint',
        paramsArray: [ec]
      });
//      jsonLoads.push({key: match[1].trim(), moduleDef: {moduleName, functionName, propertyName, moduleResolution}});
      matchBoundaries.unshift({start: match.index, end: nvRegex.lastIndex});
    }
    // Build a new string removing prior results, which are sorted in reverse index
    matchBoundaries.forEach(boundary => {
      hintsCopy = hintsCopy.substring(0, boundary.start) + hintsCopy.substring(boundary.end);
    });


    // Match unary...nothing left other than that, makes reg exp easy
    nvRegex = /\b([a-z0-9]+[-a-z0-9]*[a-z0-9]+)/g;
    match = undefined;
    matchBoundaries = [];
    while ((match = nvRegex.exec(hintsCopy)) !== null) {
      super.set(match[0], match[0]);
      matchBoundaries.unshift({start: match.index, end: nvRegex.lastIndex});
    }
    matchBoundaries.forEach(boundary => {
      hintsCopy = hintsCopy.substring(0, boundary.start) + hintsCopy.substring(boundary.end);
    });
    if(moduleResolver.hasPendingResolutions()) {
      return moduleResolver.resolve(ec)
        .then(resolutions => {
          const someErrors = resolutions.some(resolution => resolution.error);
          if(someErrors) {
            log.warn(resolutions, 'Errors resolving modules');
            throw logErrorAndReturn(new EnhancedError('Errors resolving modules'));
          } else {
            this.initialized = true;
            moduleResolver.clear();
            return this;
          }
        })
    } else {
      this.initialized = true;
      return this;
    }

/*
    if (asyncLoads) {
      const promises: (Object | Promise<Object>)[] = [];
      jsonLoads.forEach(load => {
        try {
          promises.push(loadJSONFromPackage(load.moduleDef, ec));
        } catch (err) {
          const error = new Error(`Cannot load JSON from module ${load.moduleDef.moduleName} and function ${load.moduleDef.functionName} or property ${load.moduleDef.propertyName}`);
          log.error(err);
          logErrorAndThrow(error, log, ec);
        }
      });
      return Promise.allSettled(promises)
        .then(values => {
          let hasErrors = false;
          for (let i = 0; i < values.length; i++) {
            const result = values[i];
            if (result.status === 'fulfilled') {
              const key = jsonLoads[i].key;
              super.set(key, result.value);
            } else {
              log.warn(result.reason, `Cannot load JSON from module ${jsonLoads[i].moduleDef.moduleName} and function ${jsonLoads[i].moduleDef.functionName} or property ${jsonLoads[i].moduleDef.propertyName}`);
              const err = new Error(result.reason);
              log.error(err);
              hasErrors = true;
            }
          }
          if (hasErrors) {
            logErrorAndThrow(new EnhancedError('One or more load JSON from module failed'), log, ec);
          }
          this.initialized = true;
          return this;
        });
    } else {
      jsonLoads.forEach(load => {
        try {
          let jsonObj: Object = loadJSONFromPackage(load.moduleDef, ec);
          this.set(load.key, jsonObj);
        } catch (err) {
          const error = new EnhancedError(`Cannot load JSON from module ${load.moduleDef.moduleName} and function ${load.moduleDef.functionName} or property ${load.moduleDef.propertyName}`, err);
          logErrorAndThrow(error, log, ec);
        }
      });
      this.initialized = true;
      return this;
    }*/
  }

  static peekHints(near: string, prefix: string, ec?: ExecutionContextI, enclosure: { start: string, end: string } = {
    start: '<<',
    end: '>>'
  }): Hints | Promise<Hints> {
    Hints.validatePrefix(near, prefix, ec);
    return Hints.captureHints(near, prefix, ec, enclosure);
  }

  static consumeHints(near: string, prefix: string, ec?: ExecutionContextI, enclosure: { start: string, end: string } = {
    start: '<<',
    end: '>>'
  }): string {
    // Capture remaining
    let remaining = near;
    const remainingRegExp = new RegExp(`^${enclosure.start}${prefix}[-\\s\\t\\r\\n\\v\\f\\u2028\\u2029".,=>:\(\)@\\[\\]{}/_a-zA-Z0-9]*${enclosure.end}([^]*)$`);
    const result2 = remainingRegExp.exec(remaining);
    if (result2) {
      remaining = result2[1].trim();
      return remaining;
    } else {
      const err = new Error('Should never get here [no remaining]');
      const log = new LoggerAdapter(ec, 'app-utility', 'hints', 'consumeHints');
      logErrorAndThrow(err, log, ec);
    }
  }

  static parseHints(near: string, prefix: string, ec?: ExecutionContextI, enclosure: { start: string, end: string } = {
    start: '<<',
    end: '>>'
  }): [string, Hints | Promise<Hints>] {
    const log = new LoggerAdapter(ec, 'app-utility', 'hints', 'parseHints');
    this.validatePrefix(near, prefix, ec);
    const hintsResult = Hints.captureHints(near, prefix, ec, enclosure);
    let remaining = Hints.consumeHints(near, prefix, ec, enclosure);
    return [remaining, hintsResult];
  }

  private static captureHints(near: string, prefix: string, ec?: ExecutionContextI, enclosure: { start: string, end: string } = {
    start: '<<',
    end: '>>'
  }): Hints | Promise<Hints> {
    const log = new LoggerAdapter(ec, 'app-utility', 'hints', 'captureHints');
    const regExp = new RegExp(`^${enclosure.start}${prefix}([-\\s\\t\\r\\n\\v\\f\\u2028\\u2029".,=>:\(\)@\\[\\]{}/_a-zA-Z0-9]*)${enclosure.end}[^]*$`);
    const result = regExp.exec(near);
    if (result) {
      const hints: Hints = new Hints(result[1].trim(), ec);
      const initResult = hints.loadAndInitialize(ec);
      if (isPromise(initResult)) {
        return initResult
          .then(() => {
            if (prefix && prefix.trim().length > 0) {
              hints.set(prefix, prefix);
              hints.set('prefix', prefix);
            }
            log.debug(hints, `Found hints near ${near}`);
            return hints;
          });
      } else {
        if (prefix && prefix.trim().length > 0) {
          hints.set(prefix, prefix);
          hints.set('prefix', prefix);
        }
        log.debug(hints, `Found hints near ${near}`);
        return hints;
      }
    } else {
      log.debug(`Did not find hints near ${near}`);
      const hints = new Hints('', ec);
      hints.loadAndInitialize(ec);
      return hints;
    }
  }

  private static validatePrefix(near: string, prefix: string, ec?: ExecutionContextI) {
    if (prefix) {
      if (!/^[a-z0-9]+[-a-z0-9]*[a-z0-9]+$/.test(prefix)) {
        const err = new EnhancedError(`Prefix must be lower case, use letters or numbers or the symbol -, but not at the start or the end.  It must be at least 2 characters long. Near ${near}`);
        const log = new LoggerAdapter(ec, 'app-utility', 'hints', 'validatePrefix');
        logErrorAndThrow(err, log, ec);
      }
    }
  }




  mergeInto(oHints: Hints, replace = false, ec?: ExecutionContextI) {
    this.checkInit();
    let next;
    let iter = oHints.keys();
    while ((next = iter.next()) && !next.done) {
      const key = next.value;
      if (this.has(key)) {
        if (replace) {
          this.set(key, oHints.get(key));
        }
      } else {
        this.set(key, oHints.get(key));
      }
    }
  }

  checkInit(ec?: ExecutionContextI) {
    if (!this.initialized) {
      const log = new LoggerAdapter(ec, 'app-utility', 'hints', 'checkInit');
      const err = new EnhancedError('Uninitialized Hints.  Either call init() or wait for settled promise; this can happen if Hints include loading JSON from an esModule');
      logErrorAndThrow(err, log, ec);
    }
  }


  clear(ec?: ExecutionContextI) {
    this.checkInit(ec);
    super.clear();
  }

  delete(key: string, ec?: ExecutionContextI): boolean {
    this.checkInit(ec);
    return super.delete(key);
  }

  get(key: string, ec?: ExecutionContextI): string | Object | undefined {
    this.checkInit(ec);
    return super.get(key);
  }

  has(key: string, ec?: ExecutionContextI): boolean {
    this.checkInit(ec);
    return super.has(key);
  }

  set(key: string, value: string | Object, ec?: ExecutionContextI): this {
    this.checkInit(ec);
    return super.set(key, value);
  }
}

// Case 1:  Nothing precedes or follows
//        token
//
// Case 2:  A quote precedes
//
//    something"  token  ->  /"\s+([a-z0-9]+)
//
// Case 3:  A key follows
//
//    token key =
//
// Case 4:  Another token follows
//
//    token token1



