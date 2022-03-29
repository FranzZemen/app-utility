import chai from 'chai';
import 'mocha';
import {Hints} from '../../publish';


let should = chai.should();
let expect = chai.expect;

describe('Hint Tests', () => {
  it('should parse unary header', done=> {
    const hints = new Hints('header');
    hints.size.should.equal(1);
    hints.get('header').should.exist;
    done();
  });
  it('should parse key=value', done => {
    const hints = new Hints('key=value');
    hints.size.should.equal(1);
    hints.get('key').should.equal('value');
    done();
  });
  it ('should parse key = values i.e. a space included between =', done => {
    const hints = new Hints('key = value');
    hints.size.should.equal(1);
    hints.get('key').should.equal('value');
    done();
  });
  it ('should parse key-1=value', done => {
    const hints = new Hints('key-1=value');
    hints.size.should.equal(1);
    hints.get('key-1').should.equal('value');
    done();
  })
  it('should parse key=value key2=value2', done => {
    const hints = new Hints('key=value key2=value2');
    hints.size.should.equal(2);
    hints.get('key').should.equal('value');
    hints.get('key2').should.equal('value2');
    done();
  });
  it('should parase key=value key-type=value2', done => {
    const hints = new Hints('key=value key-type=value2');
    hints.size.should.equal(2);
    hints.get('key').should.equal('value');
    hints.get('key-type').should.equal('value2');
    done();
  });
  it('should parse key="value"', done => {
    const hints = new Hints('key="value"');
    hints.size.should.equal(1);
    hints.get('key').should.equal('value');
    done();
  });
  it('should parse key="value"', done => {
    const hints = new Hints('key="some value"');
    hints.size.should.equal(1);
    hints.get('key').should.equal('some value');
    done();
  });
  it('should parse header key=value', done => {
    const hints = new Hints('header key=value');
    hints.size.should.equal(2);
    hints.get('header').should.equal('header');
    done();
  });
  it('should parse header key=value key2="some value 2"', done => {
    const hints = new Hints('header key=value key2="some value 2"');
    hints.size.should.equal(3);
    hints.get('header').should.equal('header');
    hints.get('key').should.equal('value');
    hints.get('key2').should.equal('some value 2');
    done();
  });
  it('should parse with wraps <<some-prefix key=value>>', done => {
    const [remaining, hints] = Hints.parseHints('<<some-prefix key=value>>', 'some-prefix');
    hints.size.should.equal(3);
    hints.get('some-prefix').should.equal('some-prefix');
    hints.get('prefix').should.equal('some-prefix');
    hints.get('key').should.equal('value');
    done();
  });
  it('should parse empty JSON array []', done => {
    const hints = new Hints('empty-json-array=[]');
    hints.size.should.equal(1);
    const obj = hints.get('empty-json-array');
    (typeof obj).should.equal('object');
    Array.isArray(obj).should.be.true;
    done();
  })
  it('should parse empty JSON array [] with other hints', done => {
    const hints = new Hints('key=value key2="value" empty-json-array=[] key3="value"');
    hints.size.should.equal(4);
    const obj = hints.get('empty-json-array');
    (typeof obj).should.equal('object');
    Array.isArray(obj).should.be.true;
    done();
  })

  it('should parse empty JSON object {}', done => {
    const hints = new Hints('empty-json-object={} key=value');
    hints.size.should.equal(2);
    const obj = hints.get('empty-json-object');
    (typeof obj).should.equal('object');
    JSON.stringify(obj).should.equal('{}');
    done();
  });
  it('should parse array with empty JSON object {}', done => {
    const hints = new Hints('empty-json-object=[{}] key=value');
    hints.size.should.equal(2);
    const obj = hints.get('empty-json-object');
    Array.isArray(obj).should.be.true;
    JSON.stringify(obj).should.equal('[{}]');
    done();
  });
  it('should parse simple JSON object {"foo": "bar"}', done => {
    const hints = new Hints(`simple-json-object =
    {
      "foo": "bar"
    } 
    key=value`);
    hints.size.should.equal(2);
    const obj = hints.get('simple-json-object') ;
    if(typeof obj === 'object') {
      ('foo' in obj).should.be.true;
      obj['foo'].should.equal('bar');
    }
    done();
  });

  it('should parse complex JSON object {foo: {bar: [1, 2, true]}}', done => {
    const hints = new Hints('complex-json-object = {"foo": {"bar": [1, 2, true]}} key=value');
    hints.size.should.equal(2);
    const obj = hints.get('complex-json-object') ;
    if(typeof obj === 'object') {
      ('foo' in obj).should.be.true;
      Array.isArray(obj['foo'].bar).should.be.true;
      obj['foo'].bar[1].should.equal(2);
    }
    done();
  });

  it('should parse complex JSON array [{foo: {bar: [1, 2, true]}}, {some: "value"}]', done => {
    const hints = new Hints('complex-json-array = [{"foo": {"bar": [1, 2, true]}}, {"some": "value"}] key=value');
    hints.size.should.equal(2);
    const obj = hints.get('complex-json-array');
    obj[1].some.should.equal('value');
    done();
  });

  it('should parse complex JSON array with folder spec [{foo: {bar: [1, 2, true]}}, {some: "../folder"}]', done => {
    const hints = new Hints('complex-json-array = [{"foo": {"bar": [1, 2, true]}}, {"some": "../folder"}] key=value');
    hints.size.should.equal(2);
    const obj = hints.get('complex-json-array');
    obj[1].some.should.equal('../folder');
    done();
  });

  it('should parseHints complex JSON array with folder spec [{foo: {bar: [1, 2, true]}}, {some: "../folder"}]', done => {
    let [remaining, hints] = Hints.parseHints('<<re complex-json-array = [{"foo": {"bar": [1, 2, true]}}, {"some": "../folder"}] key=value>>', 're');
    hints.size.should.equal(4);
    const obj = hints.get('complex-json-array');
    obj[1].some.should.equal('../folder');
    remaining.should.equal('');
    done();
  });
  it('should load JSON from relative path ', done => {
    let [remaining, hints] = Hints.parseHints('<<re json = @(require:../testing/hints/test.json)>>', 're');
    hints.size.should.equal(3);
    const obj = hints.get('json');
    remaining.should.equal('');
    done();
  });
  it('should load JSON from module/function ', done => {
    let [remaining, hints] = Hints.parseHints('<<re json = @(require:@franzzemen/test=>getJSON)>>', 're');
    hints.size.should.equal(3);
    const obj = hints.get('json');
    obj['hello'].should.equal('world');
    remaining.should.equal('');
    done();
  });
  it('should load JSON from module/attribute ', done => {
    let [remaining, hints] = Hints.parseHints('<<re json = @(require:@franzzemen/test:jsonStr)>>', 're');
    hints.size.should.equal(3);
    const obj = hints.get('json');
    obj['prop'].should.equal('jsonStr');
    remaining.should.equal('');
    done();
  });
  it('should parse folder paths without quotes (without spaces) ', done => {
    let [remaining, hints] = Hints.parseHints('<<re path=./../../some-_Path>>', 're');
    hints.size.should.equal(3);
    const obj = hints.get('path');
    obj.should.equal('./../../some-_Path');
    remaining.should.equal('');
    done();
  });
  it('should peek hints', done => {
    let hints = Hints.peekHints('<<re name=Hello>>', 're');
    hints.size.should.equal(3);
    hints.get('re').should.equal('re');
    hints.get('prefix').should.equal('re');
    hints.get('name').should.equal('Hello');
    done();
  });
  it('should consume hints', done => {
    let remaining = Hints.consumeHints('<<re name=Hello>> 5', 're');
    remaining.should.equal('5');
    done();
  });
});
