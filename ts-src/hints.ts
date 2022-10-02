import {isPromise} from 'util/types';
import {EnhancedError, logErrorAndReturn, logErrorAndThrow} from './enhanced-error.js';
import {ExecutionContextI} from './execution-context.js';
import {loadJSONResource, ModuleDefinition, ModuleResolution} from './load-from-module.js';
import {LoggerAdapter} from './log/index.js';
import {v4 as uuidv4} from 'uuid';
import {
  LoadPackageType,
  ModuleResolutionActionInvocation,
  ModuleResolutionResult, ModuleResolutionSetterInvocation,
  ModuleResolver
} from './module-resolver.js';

export interface HintAwaitingModuleLoad {
  key: string,
  module: ModuleDefinition
}


export class Hints extends Map<string, string | Object> {
  hintBody: string;
  // Hints are fully initialized, including asynchronous elements
  initialized = false;
  // Hints are loaded, not necessarily including asynchronous elements.
  loaded = false;
  resolverDedupId = uuidv4();

  constructor(hintBody: string, ec?: ExecutionContextI) {
    super();
    const log = new LoggerAdapter(ec, 'app-utility', 'hints', 'constructor');
    if (hintBody === undefined) {
      logErrorAndThrow(new EnhancedError('Undefined hint body'));
    }
    this.hintBody = hintBody.trim();
  }

  static peekHints(resolver: ModuleResolver, near: string, prefix: string, ec?: ExecutionContextI, enclosure: { start: string, end: string } = {
    start: '<<',
    end: '>>'
  }): Hints {
    Hints.validatePrefix(near, prefix, ec);
    return Hints.captureHints(resolver, near, prefix, ec, enclosure);
  }

  static peekAndResolveHints(near: string, prefix: string, ec?: ExecutionContextI, enclosure: { start: string, end: string } = {
    start: '<<',
    end: '>>'
  }): Hints | Promise<Hints> {
    Hints.validatePrefix(near, prefix, ec);
    return Hints.captureAndResolveHints(near, prefix, ec, enclosure);
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
      // const err = new Error('Should never get here [no remaining]');
      // const log = new LoggerAdapter(ec, 'app-utility', 'hints', 'consumeHints');
      //logErrorAndThrow(err, log, ec);
      return remaining;
    }
  }

  static parseHints(moduleResolver: ModuleResolver, near: string, prefix: string, ec?: ExecutionContextI, enclosure: { start: string, end: string } = {
    start: '<<',
    end: '>>'
  }): [string, Hints] {
    const log = new LoggerAdapter(ec, 'app-utility', 'hints', 'parseHints');
    Hints.validatePrefix(near, prefix, ec);
    const hints = Hints.captureHints(moduleResolver, near, prefix, ec, enclosure);
    let remaining = Hints.consumeHints(near, prefix, ec, enclosure);
    return [remaining, hints];
  }

  static parseAndResolveHints(near: string, prefix: string, ec?: ExecutionContextI, enclosure: { start: string, end: string } = {
    start: '<<',
    end: '>>'
  }): [string, Hints | Promise<Hints>] {
    const log = new LoggerAdapter(ec, 'app-utility', 'hints', 'parseHints');
    Hints.validatePrefix(near, prefix, ec);
    const hintsResult = Hints.captureAndResolveHints(near, prefix, ec, enclosure);
    let remaining = Hints.consumeHints(near, prefix, ec, enclosure);
    return [remaining, hintsResult];
  }

  private static captureHints(moduleResolver: ModuleResolver, near: string, prefix: string, ec?: ExecutionContextI, enclosure: { start: string, end: string } = {
    start: '<<',
    end: '>>'
  }): Hints {
    const log = new LoggerAdapter(ec, 'app-utility', 'hints', 'captureHints');
    const regExp = new RegExp(`^${enclosure.start}${prefix}([-\\s\\t\\r\\n\\v\\f\\u2028\\u2029".,=>:\(\)@\\[\\]{}/_a-zA-Z0-9]*)${enclosure.end}[^]*$`);
    const result = regExp.exec(near);
    if (result) {
      const hints: Hints = new Hints(result[1].trim(), ec);
      hints.load(moduleResolver, prefix, ec);
      return hints;
    } else {
      log.debug(`Did not find hints near ${near}`);
      const hints = new Hints('', ec);
      hints.loadAndResolve('', ec);
      return hints;
    }
  }

  private static captureAndResolveHints(near: string, prefix: string, ec?: ExecutionContextI, enclosure: { start: string, end: string } = {
    start: '<<',
    end: '>>'
  }): Hints | Promise<Hints> {
    const log = new LoggerAdapter(ec, 'app-utility', 'hints', 'captureHints');
    const regExp = new RegExp(`^${enclosure.start}${prefix}([-\\s\\t\\r\\n\\v\\f\\u2028\\u2029".,=>:\(\)@\\[\\]{}/_a-zA-Z0-9]*)${enclosure.end}[^]*$`);
    const result = regExp.exec(near);
    if (result) {
      const hints: Hints = new Hints(result[1].trim(), ec);
      return hints.loadAndResolve(prefix, ec);
    } else {
      log.debug(`Did not find hints near ${near}`);
      const hints = new Hints('', ec);
      hints.loadAndResolve('', ec);
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

  // For use by ModuleResolver
  setHintResolution: ModuleResolutionSetterInvocation = (key: string, value: any, result: ModuleResolutionResult, ec?: ExecutionContextI) => {
    super.set(key, value);
    return true;
  };

  initActionResolution: ModuleResolutionActionInvocation = (successfulResolution: boolean, prefix: string, ec?: ExecutionContextI) => {
    // Regardless over overall success, that this method is called means that all module resoltuions associated with this
    // instance were satisfied.
    this.initialized = true;
    if (prefix && prefix.trim().length > 0) {
      super.set(prefix, prefix);
      super.set('prefix', prefix);
    }
    return true;
  };

  /**
   *
   * @param moduleResolver
   * @param prefix
   * @param ec
   */
  public load(moduleResolver: ModuleResolver, prefix: string, ec?: ExecutionContextI) {
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
    while ((match = nvRegex.exec(hintsCopy)) !== null) {
      const key = match[1].trim();
      const importStatement = match[2].trim();
      let moduleResolution = ModuleResolution.commonjs;
      if (importStatement === 'import') {
        moduleResolution = ModuleResolution.es;
      }
      const moduleName = match[3].trim();
      const attribOrFunction = match[4].trim();
      let functionName: string, propertyName: string;
      if (attribOrFunction === ':') {
        propertyName = match[5].trim();
      } else {
        functionName = match[5].trim();
      }
      const module: ModuleDefinition = {
        moduleName,
        functionName,
        propertyName,
        moduleResolution
      };
      // Do add the hint with a temporary placeholder, it will be replaced upon resolution.
      const tempHintValue: HintAwaitingModuleLoad = {
        key,
        module
      };
      super.set(key, tempHintValue);
      // We need to allow module resolver to just have an action...because here init will only be called if there's a module loaded and we need to set prefix once and abosulately once
      moduleResolver.add({
        refName: key,
        loader: {
          module,
          loadPackageType: LoadPackageType.json
        },
        setter: {
          ownerIsObject: true,
          objectRef: this,
          _function: 'setHintResolution',
          paramsArray: [ec],
          isAsync: false
        },
        action: {
          dedupId: this.resolverDedupId,
          ownerIsObject: true,
          objectRef: this,
          _function: 'initActionResolution',
          paramsArray: [prefix, ec],
          isAsync: false
        }
      });
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
    // Regardless of whether we loaded anything or not, we are in the ModuleResolver's world and
    // need to guarantee this object is initialized, but use same dedupid
    moduleResolver.add({
      refName: 'all',
      action: {
        dedupId: this.resolverDedupId,
        ownerIsObject: true,
        objectRef: this,
        _function: 'initActionResolution',
        paramsArray: [prefix, ec],
        isAsync: false
      }
    });
    this.loaded = true;
  }

  loadAndResolve(prefix?: string, ec?: ExecutionContextI): Hints | Promise<Hints> {
    const log = new LoggerAdapter(ec, 'app-utility', 'hints', 'loadAndResolve');
    const moduleResolver = new ModuleResolver();
    this.load(moduleResolver, prefix, ec);
    if (moduleResolver.hasPendingResolutions()) {
      const results = moduleResolver.resolve(ec);
      if (isPromise(results)) {
        return results
          .then(resolutions => {
            const someErrors = ModuleResolver.resolutionsHaveErrors(resolutions);
            if (someErrors) {
              log.warn(resolutions, 'Errors resolving modules');
              throw logErrorAndReturn(new EnhancedError('Errors resolving modules'));
            } else {
              this.initialized = true;
              moduleResolver.clear();
              return this;
            }
          });
      } else {
        this.initialized = true;
        moduleResolver.clear();
        return this;
      }
    } else {
      this.initialized = true;
      return this;
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
      if (!this.loaded) {
        const log = new LoggerAdapter(ec, 'app-utility', 'hints', 'checkInit');
        const err = new EnhancedError('Uninitialized Hints.  Either call init() or wait for settled promise; this can happen if Hints include loading JSON from an esModule');
        logErrorAndThrow(err, log, ec);
      }
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



