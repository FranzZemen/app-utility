import chai from 'chai';
import Validator, {ValidationSchema} from 'fastest-validator';
import 'mocha';
import {
  CheckFunction,
  isAsyncCheckFunction, isCheckFunction, isLoadSchema,
  isSyncCheckFunction,
  LoadSchema
} from '../../publish/index.js';

let should = chai.should();
let expect = chai.expect;

describe('app-utility tests', () => {
  describe('fastest-validator-util/fastest-validator-util.test', () => {
    it('should identify a validation schema', done => {
      const schema: LoadSchema = {
        validationSchema: {
          something: {
            type: 'object',
            optional: true,
            props: {
              someProp: {type: 'boolean', optional: true}
            }
          }
        },
        useNewCheckerFunction: false
      }
      isLoadSchema(schema).should.be.true;
      isCheckFunction(schema).should.be.false;
      isAsyncCheckFunction(schema).should.be.false;
      done();
    });
    it('should identify a synchronous check', done => {
      const schema: ValidationSchema = {
        something: {
          type: 'object',
          optional: true,
          props: {
            someProp: {type: 'boolean', optional: true}
          }
        }
      }
      const check: CheckFunction = (new Validator()).compile(schema);
      isSyncCheckFunction(check).should.be.true;
      isAsyncCheckFunction(check).should.be.false;
      isLoadSchema(check).should.be.false;
      done();
    })
    it('should identify an asynchronous check', done => {
      function dummyAsync(v): Promise<number> {
        return Promise.resolve(v);
      }
      const schema: ValidationSchema = {
        $$async: true,
        something: {
          type: 'object',
          optional: true,
          props: {
            someProp: {type: 'boolean', optional: true},
            username: {
              type: "number",
              custom: async (v, errors) => {
                return dummyAsync(v);
              }
            }
          }
        }
      }
      const check: CheckFunction = (new Validator()).compile(schema);
      isAsyncCheckFunction(check).should.be.true;
      isSyncCheckFunction(check).should.be.false;
      isLoadSchema(check).should.be.false;
      done();
    })
  })
})
