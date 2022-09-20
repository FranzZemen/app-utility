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
    const result = hints.loadAndResolve();
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
    const result = hints.loadAndResolve();
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
    const result = hints.loadAndResolve();
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
    const result = hints.loadAndResolve();
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
    const result = hints.loadAndResolve();
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
    const result = hints.loadAndResolve();
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
    const result = hints.loadAndResolve();
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
    const result = hints.loadAndResolve();
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
    const result = hints.loadAndResolve();
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
    const result = hints.loadAndResolve();
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
    const [remaining, hintsOrPromise] = Hints.parseHints('<<some-prefix key=value>>', 'some-prefix');
    if(isPromise(hintsOrPromise)) {
      unreachableCode.should.be.true;
      return
    }
    else {
      remaining.length.should.equal(0);
      const hints = hintsOrPromise;
      hints.size.should.equal(3);
      hints.get('some-prefix').should.equal('some-prefix');
      hints.get('prefix').should.equal('some-prefix');
      hints.get('key').should.equal('value');
    }
  });
  it('should parse empty JSON array []', () => {
    let hints: Hints | Promise<Hints> = new Hints('empty-json-array=[]');
    hints = hints.loadAndResolve();
    if (isPromise(hints)) {
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
    let hints: Hints | Promise<Hints> = new Hints('key=value key2="value" empty-json-array=[] key3="value"');
    hints = hints.loadAndResolve();
    if (isPromise(hints)) {
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
    let hints: Hints | Promise<Hints> = new Hints('empty-json-object={} key=value');
    hints = hints.loadAndResolve();
    if (isPromise(hints)) {
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
    let hints: Hints | Promise<Hints> = new Hints('empty-json-object=[{}] key=value');
    hints = hints.loadAndResolve();
    if (isPromise(hints)) {
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
    let hints: Hints | Promise<Hints> = new Hints(`simple-json-object =
    {
      "foo": "bar"
    } 
    key=value`);
    hints = hints.loadAndResolve();
    if (isPromise(hints)) {
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
    let hints: Hints | Promise<Hints> = new Hints('complex-json-object = {"foo": {"bar": [1, 2, true]}} key=value');
    hints = hints.loadAndResolve();
    if (isPromise(hints)) {
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
    let hints: Hints | Promise<Hints> = new Hints('complex-json-array = [{"foo": {"bar": [1, 2, true]}}, {"some": "value"}] key=value');
    hints = hints.loadAndResolve();
    if (isPromise(hints)) {
      unreachableCode.should.be.true;
      return;
    } else {
      hints.size.should.equal(2);
      const obj = hints.get('complex-json-array');
      obj[1].some.should.equal('value');
    }
  });

  it('should parse complex JSON array with folder spec [{foo: {bar: [1, 2, true]}}, {some: "../folder"}]', () => {
    let hints: Hints | Promise<Hints> = new Hints('complex-json-array = [{"foo": {"bar": [1, 2, true]}}, {"some": "../folder"}] key=value');
    hints = hints.loadAndResolve();
    if (isPromise(hints)) {
      unreachableCode.should.be.true;
      return;
    } else {
      hints.size.should.equal(2);
      const obj = hints.get('complex-json-array');
      obj[1].some.should.equal('../folder');
    }
  });

  it('should parseHints complex JSON array with folder spec [{foo: {bar: [1, 2, true]}}, {some: "../folder"}]', () => {
    const [remaining, hintsOrPromise] = Hints.parseHints('<<re complex-json-array = [{"foo": {"bar": [1, 2, true]}}, {"some": "../folder"}] key=value>>', 're');
    if(isPromise(hintsOrPromise)) {
      unreachableCode.should.be.true;
    } else {
      const hints: Hints = hintsOrPromise;

      hints.size.should.equal(4);
      const obj = hints.get('complex-json-array');
      obj[1].some.should.equal('../folder');
      remaining.should.equal('');
    }
  });

  it('should load JSON from relative path ', () => {
    const [remaining, hintsOrPromise] = Hints.parseHints('<<re json = @(require:../testing/hints/test.json)>>', 're');
    if(isPromise(hintsOrPromise)) {
      unreachableCode.should.be.true;
    } else {
      const hints: Hints = hintsOrPromise;

      hints.size.should.equal(3);
      const obj = hints.get('json');
      remaining.should.equal('');
    }
  });

  it('should load JSON from module/function ', () => {
    const [remaining, hintsOrPromise] = Hints.parseHints('<<re json = @(import:@franzzemen/test=>getJSON)>>', 're');
    if(isPromise(hintsOrPromise)) {
      return hintsOrPromise
        .then(hints => {
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
    const [remaining, hintsOrPromise]= Hints.parseHints('<<re json = @(import:@franzzemen/test:jsonStr)>>', 're');
    if(isPromise(hintsOrPromise)) {
      return hintsOrPromise
        .then(hints => {

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
    const [remaining, hintsOrPromise] = Hints.parseHints('<<re path=./../../some-_Path>>', 're');
    if(isPromise(hintsOrPromise)) {
      unreachableCode.should.be.true;
    } else {
      const hints: Hints = hintsOrPromise;

      hints.size.should.equal(3);
      const obj = hints.get('path');
      obj.should.equal('./../../some-_Path');
      remaining.should.equal('');
    }
  });
  it('should peek hints', () => {
    const hintsOrPromise = Hints.peekHints('<<re name=Hello>>', 're');
    if(isPromise(hintsOrPromise)) {
      unreachableCode.should.be.true;
    } else {
      const hints = hintsOrPromise;

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
