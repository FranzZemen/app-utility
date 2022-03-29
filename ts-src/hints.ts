import {ExecutionContextI} from './execution-context';
import {loadJSONFromPackage, loadJSONResource} from './load-from-module';
import {LoggerAdapter} from './log';

export type Fragment = {frag: string, start: number, end?: number}

export class Hints extends Map<string, string | Object> {
  hintBody: string;

  static peekHints(near: string, prefix: string, ec?: ExecutionContextI, enclosure: {start: string, end: string} = {start: '<<', end: '>>'}): Hints {
    Hints.validatePrefix(near, prefix, ec);
    return Hints.captureHints(near, prefix, ec, enclosure);
  }

  static consumeHints(near: string, prefix: string, ec?: ExecutionContextI, enclosure: {start: string, end: string} = {start: '<<', end: '>>'}): string {
    // Capture remaining
    let remaining = near;
    const remainingRegExp = new RegExp(`^${enclosure.start}${prefix}[-\\s\\t\\r\\n\\v\\f\\u2028\\u2029".,=>:\(\)@\\[\\]{}/_a-zA-Z0-9]*${enclosure.end}([^]*)$`);
    const result2 = remainingRegExp.exec(remaining);
    if(result2) {
      remaining = result2[1].trim();
      return remaining;
    } else {
      const err = new Error('Should never get here [no remaining]');
      const log = new LoggerAdapter(ec, 'base-utility', 'hints', 'consumeHints');
      log.error(err);
      throw err;
    }
  }


  static parseHints(near: string, prefix: string, ec?: ExecutionContextI, enclosure: {start: string, end: string} = {start: '<<', end: '>>'}): [string, Hints] {
    const log = new LoggerAdapter(ec, 'base-utility', 'hints', 'parseHints');
    this.validatePrefix(near, prefix, ec);
    const hints = Hints.captureHints(near, prefix, ec, enclosure);
    if(hints?.size > 0) {
      let remaining = Hints.consumeHints(near, prefix, ec, enclosure);
      // Capture remaining
      return [remaining, hints];
    } else {
      return [near, new Hints('')];
    }
  }

  mergeInto(oHints: Hints, replace = false, ec?: ExecutionContextI)  {
    let next;
    let iter = oHints.keys();
    while((next = iter.next()) && !next.done) {
      const key = next.value;
      if(this.has(key)) {
        if(replace) {
          this.set(key, oHints.get(key));
        }
      } else {
        this.set(key, oHints.get(key));
      }
    }
  }

  constructor(hintBody: string, execContext?: ExecutionContextI) {
    super();
    const log = new LoggerAdapter(execContext, 'base-utility', 'hints', 'constructor');
    if(!hintBody || hintBody.trim().length === 0) {
      log.warn('No text provided to parse hints');
      return;
    }
    this.hintBody = hintBody.trim();
    // Locate name, value pairs with JSON
    let nvRegex = /([a-z0-9]+[-a-z0-9]*[a-z0-9]+)[\s\t\r\n\v\f\u2028\u2029]*=[\s\t\r\n\v\f\u2028\u2029]*([\[{][^]*[}|\]])/g;
    let match = undefined;
    let matchBoundaries: {start: number, end: number}[] =[];
    while((match = nvRegex.exec(this.hintBody)) !== null) {
      const jsonStr = match[2].trim();
      try {
        const json = JSON.parse(jsonStr);
        this.set(match[1], json);
      } catch (err) {
        const error = new Error(`Cannot parse JSON hint ${jsonStr}`);
        log.error(error);
        log.error(err);
        throw error;
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
    matchBoundaries =[];
    while((match = nvRegex.exec(hintsCopy)) !== null) {
      const resource = match[2].trim();
      try {
        const json = loadJSONResource(resource);
        this.set(match[1], json);
      } catch (err) {
        const error = new Error(`Cannot load JSON from relative path ${resource}`);
        log.error(error);
        log.error(err);
        throw error;
      }
      matchBoundaries.unshift({start: match.index, end: nvRegex.lastIndex});
    }
    // Build a new string removing prior results, which are sorted in reverse index
    matchBoundaries.forEach(boundary => {
      hintsCopy = hintsCopy.substring(0, boundary.start) + hintsCopy.substring(boundary.end);
    });

    // Locate name, JSON from package/functions/attributes
    nvRegex = /([a-z0-9]+[-a-z0-9]*[a-z0-9]+)[\s\t\r\n\v\f\u2028\u2029]*=[\s\t\r\n\v\f\u2028\u2029]*@\(require:([a-zA-Z0-9 @./\\-_]+)(:|=>)([a-zA-Z0-9_.\[\]"']+)\)/g;
    match = undefined;
    matchBoundaries =[];
    while((match = nvRegex.exec(hintsCopy)) !== null) {
      const moduleName = match[2].trim();
      const attribOrFunction = match[3].trim();
      let functionName: string, propertyName:string;
      if(attribOrFunction === ':') {
        propertyName = match[4].trim();
      } else {
        functionName = match[4].trim();
      }
      let json;
      try {
        if(propertyName) {
          json = loadJSONFromPackage({moduleName, propertyName});
        } else {
          json = loadJSONFromPackage({moduleName, functionName});
        }
        this.set(match[1], json);
      } catch (err) {
        const error = new Error(`Cannot load JSON from module ${moduleName} and function ${functionName} or property ${propertyName}`);
        log.error(error);
        log.error(err);
        throw error;
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
    while((match = nvRegex.exec(hintsCopy)) !== null) {
      this.set(match[1], match[2].trim());
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
    while((match = nvRegex.exec(hintsCopy)) !== null) {
      this.set(match[1], match[2]);
      matchBoundaries.unshift({start: match.index, end: nvRegex.lastIndex});
    }
    matchBoundaries.forEach(boundary => {
      hintsCopy = hintsCopy.substring(0, boundary.start) + hintsCopy.substring(boundary.end);
    });

    // Locate unary hints
    nvRegex = /\b([a-z0-9]+[-a-z0-9]*[a-z0-9]+)/g;
    match = undefined;
    while((match = nvRegex.exec(hintsCopy)) !== null) {
      this.set(match[1], match[1]);
    }
  }
  private static captureHints(near: string, prefix: string, ec?: ExecutionContextI, enclosure: {start: string, end: string} = {start: '<<', end: '>>'}): Hints {
    const log = new LoggerAdapter(ec, 'base-utility', 'hints', 'captureHints');
    const regExp = new RegExp(`^${enclosure.start}${prefix}([-\\s\\t\\r\\n\\v\\f\\u2028\\u2029".,=>:\(\)@\\[\\]{}/_a-zA-Z0-9]*)${enclosure.end}[^]*$`);
    const result = regExp.exec(near);
    if (result) {
      const hints = new Hints(result[1].trim(), ec);
      if(prefix && prefix.trim().length > 0) {
        hints.set(prefix, prefix);
        hints.set('prefix', prefix);
      }
      log.debug(hints, `Found hints near ${near}`)
      return hints;
    } else {
      log.debug(`Did not find hints near ${near}`);
      return new Hints('');
    }
  }

  private static validatePrefix(near: string, prefix: string, ec?: ExecutionContextI) {
    if (prefix) {
      if (!/^[a-z0-9]+[-a-z0-9]*[a-z0-9]+$/.test(prefix)) {
        const err = new Error(`Prefix must be lower case, use letters or numbers or the symbol -, but not at the start or the end.  It must be at least 2 characters long. Near ${near}`);
        const log = new LoggerAdapter(ec, 'base-utility', 'hints', 'validatePrefix');
        log.error(err);
        throw err;
      }
    }
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



