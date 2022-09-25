import 'mocha';
import chai from 'chai';
import {EnhancedError, logErrorAndReturn, logErrorAndThrow} from '../publish/enhanced-error.js';

const expect = chai.expect;
const should = chai.should();

describe('app-utility tests', () => {
  describe('EnhancedError tests', () =>{
    describe('enhanced-error.test', () => {
      it('Should create and log an error', () => {
        try {
          const enhanced = new EnhancedError('An error');
          enhanced.isLogged.should.be.false;
          enhanced.isOriginalError = true;
          logErrorAndThrow(enhanced);
        } catch (err) {
          (err instanceof EnhancedError).should.be.true;
          err.isLogged.should.be.true;
        }
      })
      it('Should wrap and log an error', () => {
        try {
          throw new Error('Some Error');
        } catch (err) {
          try {
            logErrorAndThrow(err);
          } catch (enhanced) {
            (enhanced instanceof EnhancedError).should.be.true;
            enhanced.isLogged.should.be.true;
            try {
              logErrorAndThrow(enhanced);
            } catch (enhanced2) {
              (enhanced2 instanceof EnhancedError).should.be.true;
              enhanced2.isLogged.should.be.true;
            }
          }
        }
      })
      it('Should get super.message', () => {
        const err = new EnhancedError('Hello World');
        err.message.should.equal('Hello World');
      })
      it('Should get contained error message', () => {
        const err = new EnhancedError('Hello World', new Error('Goodbye'));
        err.message.should.equal('Goodbye');
      })
      it('Should return an error with string initialzation', () => {
        const err = logErrorAndReturn('Hello World');
        err.message.should.equal('Hello World');
      })
    })
  })
})
