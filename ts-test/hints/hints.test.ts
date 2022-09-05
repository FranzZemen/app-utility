import chai from 'chai';
import 'mocha';
import {isPromise} from 'util/types';
import {Hints} from '../../publish/hints.js';

let should = chai.should();
let expect = chai.expect;

const unreachableCode = false;


describe('Hint Tests', () => {
  it('should parse unary header', () => {
    const hints = new Hints('header');
    const result = hints.loadAndInitialize();
    if (isPromise(result)) {
      unreachableCode.should.be.true;
      return;
    } else {
      hints.size.should.equal(1);
      hints.get('header').should.exist;
    }
  });
  it('should parse key=value', () => {
    const hints = new Hints('key=value');
    const result = hints.loadAndInitialize();
    if (isPromise(result)) {
      unreachableCode.should.be.true;
      return;
    } else {
      hints.size.should.equal(1);
      hints.get('key').should.equal('value');
    }
  });
  it('should parse key = values i.e. a space included between =', () => {
    const hints = new Hints('key = value');
    const result = hints.loadAndInitialize();
    if (isPromise(result)) {
      unreachableCode.should.be.true;
      return;
    } else {
      hints.size.should.equal(1);
      hints.get('key').should.equal('value');
    }
  });
  it('should parse key-1=value', () => {
    const hints = new Hints('key-1=value');
    const result = hints.loadAndInitialize();
    if (isPromise(result)) {
      unreachableCode.should.be.true;
      return;
    } else {
      hints.size.should.equal(1);
      hints.get('key-1').should.equal('value');
    }
  });
  it('should parse key=value key2=value2', () => {
    const hints = new Hints('key=value key2=value2');
    const result = hints.loadAndInitialize();
    if (isPromise(result)) {
      unreachableCode.should.be.true;
      return;
    } else {
      hints.size.should.equal(2);
      hints.get('key').should.equal('value');
      hints.get('key2').should.equal('value2');
    }
  });
  it('should parase key=value key-type=value2', () => {
    const hints = new Hints('key=value key-type=value2');
    const result = hints.loadAndInitialize();
    if (isPromise(result)) {
      unreachableCode.should.be.true;
      return;
    } else {
      hints.size.should.equal(2);
      hints.get('key').should.equal('value');
      hints.get('key-type').should.equal('value2');
    }
  });
  it('should parse key="value"', () => {
    const hints = new Hints('key="value"');
    const result = hints.loadAndInitialize();
    if (isPromise(result)) {
      unreachableCode.should.be.true;
      return;
    } else {
      hints.size.should.equal(1);
      hints.get('key').should.equal('value');
    }
  });
  it('should parse key="value"', () => {
    const hints = new Hints('key="some value"');
    const result = hints.loadAndInitialize();
    if (isPromise(result)) {
      unreachableCode.should.be.true;
      return;
    } else {
      hints.size.should.equal(1);
      hints.get('key').should.equal('some value');
    }
  });
  it('should parse header key=value', () => {
    const hints = new Hints('header key=value');
    const result = hints.loadAndInitialize();
    if (isPromise(result)) {
      unreachableCode.should.be.true;
      return;
    } else {
      hints.size.should.equal(2);
      hints.get('header').should.equal('header');
    }
  });
  it('should parse header key=value key2="some value 2"', () => {
    const hints = new Hints('header key=value key2="some value 2"');
    const result = hints.loadAndInitialize();
    if (isPromise(result)) {
      unreachableCode.should.be.true;
      return;
    } else {
      hints.size.should.equal(3);
      hints.get('header').should.equal('header');
      hints.get('key').should.equal('value');
      hints.get('key2').should.equal('some value 2');
    }
  });
  it('should parse with wraps <<some-prefix key=value>>', () => {
    const result = Hints.parseHints('<<some-prefix key=value>>', 'some-prefix');
    if(isPromise(result)) {
      unreachableCode.should.be.true;
      return
    }
    else {
      const hints = result[1];
      hints.size.should.equal(3);
      hints.get('some-prefix').should.equal('some-prefix');
      hints.get('prefix').should.equal('some-prefix');
      hints.get('key').should.equal('value');
    }
  });
  it('should parse empty JSON array []', () => {
    const hints = new Hints('empty-json-array=[]');
    const result = hints.loadAndInitialize();
    if (isPromise(result)) {
      unreachableCode.should.be.true;
      return;
    } else {
      hints.size.should.equal(1);
      const obj = hints.get('empty-json-array');
      (typeof obj).should.equal('object');
      Array.isArray(obj).should.be.true;
    }
  });
  it('should parse empty JSON array [] with other hints', () => {
    const hints = new Hints('key=value key2="value" empty-json-array=[] key3="value"');
    const result = hints.loadAndInitialize();
    if (isPromise(result)) {
      unreachableCode.should.be.true;
      return;
    } else {
      hints.size.should.equal(4);
      const obj = hints.get('empty-json-array');
      (typeof obj).should.equal('object');
      Array.isArray(obj).should.be.true;
    }
  });

  it('should parse empty JSON object {}', () => {
    const hints = new Hints('empty-json-object={} key=value');
    const result = hints.loadAndInitialize();
    if (isPromise(result)) {
      unreachableCode.should.be.true;
      return;
    } else {
      hints.size.should.equal(2);
      const obj = hints.get('empty-json-object');
      (typeof obj).should.equal('object');
      JSON.stringify(obj).should.equal('{}');
    }
  });
  it('should parse array with empty JSON object {}', () => {
    const hints = new Hints('empty-json-object=[{}] key=value');
    const result = hints.loadAndInitialize();
    if (isPromise(result)) {
      unreachableCode.should.be.true;
      return;
    } else {
      hints.size.should.equal(2);
      const obj = hints.get('empty-json-object');
      Array.isArray(obj).should.be.true;
      JSON.stringify(obj).should.equal('[{}]');
    }
  });
  it('should parse simple JSON object {"foo": "bar"}', () => {
    const hints = new Hints(`simple-json-object =
    {
      "foo": "bar"
    } 
    key=value`);
    const result = hints.loadAndInitialize();
    if (isPromise(result)) {
      unreachableCode.should.be.true;
      return;
    } else {
      hints.size.should.equal(2);
      const obj = hints.get('simple-json-object');
      if (typeof obj === 'object') {
        ('foo' in obj).should.be.true;
        obj['foo'].should.equal('bar');
      }
    }
  });

  it('should parse complex JSON object {foo: {bar: [1, 2, true]}}', () => {
    const hints = new Hints('complex-json-object = {"foo": {"bar": [1, 2, true]}} key=value');
    const result = hints.loadAndInitialize();
    if (isPromise(result)) {
      unreachableCode.should.be.true;
      return;
    } else {
      hints.size.should.equal(2);
      const obj = hints.get('complex-json-object');
      if (typeof obj === 'object') {
        ('foo' in obj).should.be.true;
        Array.isArray(obj['foo'].bar).should.be.true;
        obj['foo'].bar[1].should.equal(2);
      }
    }
  });

  it('should parse complex JSON array [{foo: {bar: [1, 2, true]}}, {some: "value"}]', () => {
    const hints = new Hints('complex-json-array = [{"foo": {"bar": [1, 2, true]}}, {"some": "value"}] key=value');
    const result = hints.loadAndInitialize();
    if (isPromise(result)) {
      unreachableCode.should.be.true;
      return;
    } else {
      hints.size.should.equal(2);
      const obj = hints.get('complex-json-array');
      obj[1].some.should.equal('value');
    }
  });

  it('should parse complex JSON array with folder spec [{foo: {bar: [1, 2, true]}}, {some: "../folder"}]', () => {
    const hints = new Hints('complex-json-array = [{"foo": {"bar": [1, 2, true]}}, {"some": "../folder"}] key=value');
    const result = hints.loadAndInitialize();
    if (isPromise(result)) {
      unreachableCode.should.be.true;
      return;
    } else {
      hints.size.should.equal(2);
      const obj = hints.get('complex-json-array');
      obj[1].some.should.equal('../folder');
    }
  });

  it('should parseHints complex JSON array with folder spec [{foo: {bar: [1, 2, true]}}, {some: "../folder"}]', () => {
    let result = Hints.parseHints('<<re complex-json-array = [{"foo": {"bar": [1, 2, true]}}, {"some": "../folder"}] key=value>>', 're');
    if(isPromise(result)) {
      unreachableCode.should.be.true;
    } else {
      const remaining = result[0];
      const hints = result[1];

      hints.size.should.equal(4);
      const obj = hints.get('complex-json-array');
      obj[1].some.should.equal('../folder');
      remaining.should.equal('');
    }
  });

  it('should load JSON from relative path ', () => {
    let result = Hints.parseHints('<<re json = @(require:../testing/hints/test.json)>>', 're');
    if(isPromise(result)) {
      unreachableCode.should.be.true;
    } else {
      const remaining = result[0];
      const hints = result[1];

      hints.size.should.equal(3);
      const obj = hints.get('json');
      remaining.should.equal('');
    }
  });

  it('should load JSON from module/function ', () => {
    let result = Hints.parseHints('<<re json = @(import:@franzzemen/test=>getJSON)>>', 're');
    if(isPromise(result)) {
      return result
        .then(tuple => {
          const remaining = tuple[0];
          const hints = tuple[1];

          hints.size.should.equal(3);
          const obj = hints.get('json');
          obj['hello'].should.equal('world');
          remaining.should.equal('');
        }, err=> {
          console.error(err);
          unreachableCode.should.be.true;
        })
    } else {
      unreachableCode.should.be.true;
    }
  });
  it('should load JSON from module/attribute ', () => {
    let result = Hints.parseHints('<<re json = @(import:@franzzemen/test:jsonStr)>>', 're');
    if(isPromise(result)) {
      return result
        .then(tuple => {
          const remaining = tuple[0];
          const hints = tuple[1];

          hints.size.should.equal(3);
          const obj = hints.get('json');
          obj['prop'].should.equal('jsonStr');
          remaining.should.equal('');
        });
    } else {
      unreachableCode.should.be.true;
    }
  });
  it('should parse folder paths without quotes (without spaces) ', () => {
    const result = Hints.parseHints('<<re path=./../../some-_Path>>', 're');
    if(isPromise(result)) {
      unreachableCode.should.be.true;
    } else {
      const remaining = result[0];
      const hints = result[1];

      hints.size.should.equal(3);
      const obj = hints.get('path');
      obj.should.equal('./../../some-_Path');
      remaining.should.equal('');
    }
  });
  it('should peek hints', () => {
    const result = Hints.peekHints('<<re name=Hello>>', 're');
    if(isPromise(result)) {
      unreachableCode.should.be.true;
    } else {
      const hints = result;

      hints.size.should.equal(3);
      hints.get('re').should.equal('re');
      hints.get('prefix').should.equal('re');
      hints.get('name').should.equal('Hello');
    }
  });
  it('should consume hints', () => {
    let remaining = Hints.consumeHints('<<re name=Hello>> 5', 're');
    remaining.should.equal('5');
  });
});
