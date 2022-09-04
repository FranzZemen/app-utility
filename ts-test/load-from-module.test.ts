import chai from 'chai';
import 'mocha';
import {isConstrainedModuleDefinition, isModuleDefinition, loadFromModule} from '../publish/index.js';

let should = chai.should();
let expect = chai.expect;

describe('Base Utility Tests', () => {
  describe('Load from module tests', () => {
    describe('load-from-module.test', () => {
      it('should validate module, not constrained module', done => {
        const obj = {moduleName: 'SomeModule'};
        isModuleDefinition(obj).should.be.true;
        isConstrainedModuleDefinition(obj).should.be.false;
        done();
      });
      it('should fail to validate module', done => {
        const obj = {moduleName: 'SomeModule', functionName: 'someFunction', constructorName: 'someConstructor'};
        isModuleDefinition(obj).should.be.false;
        isConstrainedModuleDefinition(obj).should.be.false;
        done();
      });
      it('should fail to validate module', done => {
        const obj = {moduleName: 'SomeModule', functionName: 'someFunction', propertyName: 'someProperty'};
        isModuleDefinition(obj).should.be.false;
        isConstrainedModuleDefinition(obj).should.be.false;
        done();
      });
      it('should fail to validate module', done => {
        const obj = {moduleName: 'SomeModule', constructorName: 'someConstructor', propertyName: 'someProperty'};
        isModuleDefinition(obj).should.be.false;
        isConstrainedModuleDefinition(obj).should.be.false;
        done();
      });
      it('should fail to validate module for constrained function', done => {
        const obj = {moduleName: 'SomeModule', functionName: 'someFunction'};
        isModuleDefinition(obj).should.be.true;
        isConstrainedModuleDefinition(obj).should.be.true;
        done();
      });
      it('should fail to validate module for constrained constructor', done => {
        const obj = {moduleName: 'SomeModule', constructorName: 'someConstructor'};
        isModuleDefinition(obj).should.be.true;
        isConstrainedModuleDefinition(obj).should.be.true;
        done();
      });
      it('should fail to validate module for constrained property', done => {
        const obj = {moduleName: 'SomeModule', constructorName: 'someProperty'};
        isModuleDefinition(obj).should.be.true;
        isConstrainedModuleDefinition(obj).should.be.true;
        done();
      });
      it('should load via module default from bad-extended', done => {
        // Path relative to root of package, at test time this is relative to publish
        const result = loadFromModule<any>({moduleName: '../testing/bad-extended.cjs'});
        expect(result).to.exist;
        done();
      });
      /*
      it('should load a via module function from extended', done => {
        const result = loadFromModule<any>({moduleName: '../testing/extended', functionName: 'create2'});
        expect(result).to.exist;
        done();
      });
      it('should load a via module constructor from extended', done => {
        const result = loadFromModule<any>({
          moduleName: '../testing/extended',
          constructorName: 'TestDataType'
        });
        expect(result).to.exist;
        done();
      });

       */
    });
  });
});

export const dummy = 1;
