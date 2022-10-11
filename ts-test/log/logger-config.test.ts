import chai from 'chai';
import 'mocha';
import {ExecutionContextI, LogConfigI, LoggerAdapter, validateLogConfig} from '../../publish/index.js';

let should = chai.should();
let expect = chai.expect;

describe ('base-utility tests', () => {
  describe('logger-config-tests', () => {
    it ('should validate', done => {
      const logConfig = {
        log: {
          loggerModule: {
            moduleName: 'test',
            constructorName: 'test',
            functionName: 'getLogger'
          },
          level: 'debug',

          overrides: [
            {
              repo: 'test2',
              level: 'info',
              method: ['method1', 'method2'],
              source: 'index'
            }
          ]
        }
      }
      const result = validateLogConfig(logConfig.log)
      result.should.be.true;
      done();
    });
    it('should log', done => {
      const execContext: ExecutionContextI = {
        config: {
            log:{
              level:'debug'}
        }
      };
      const log: LoggerAdapter = new LoggerAdapter(execContext);
      done();
    });
    it('should log, hiding attributes', done => {
      const execContext: ExecutionContextI = {
        config: {
          log:{
            level:'debug',
            logAttributes: {
              hideAppContext: true,
              hideLevel: true,
              hideMethod: true,
              hideRepo: true,
              hideRequestId: true,
              hideSourceFile: true,
              hideThread: true
            }
          }
        }
      };
      const log: LoggerAdapter = new LoggerAdapter(execContext);
      log.debug('It is bar?');
      log.debug({foo: 'bar'}, 'It is foo bar');
      done();
    });
    it('should log, flattening', done => {
      const execContext: ExecutionContextI = {
        config: {
          log:{
            level:'debug',
            flatten: true
          }
        }
      };
      const log: LoggerAdapter = new LoggerAdapter(execContext);
      log.debug('It is bar2?');
      log.debug({foo: 'bar2'}, 'It is foo bar2');
      done();
    });
    it('should log, hiding timestamp and severity prefix', done => {
      const execContext: ExecutionContextI = {
        config: {
          log:{
            level:'debug',
            hideTimestamp: true,
            hideSeverityPrefix: true
          }
        }
      };
      const log: LoggerAdapter = new LoggerAdapter(execContext);
      log.debug('It is bar2?');
      log.debug({foo: 'bar2'}, 'It is foo bar2');
      done();
    });
  });
});
