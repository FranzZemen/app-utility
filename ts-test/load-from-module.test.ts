import chai from 'chai';
import Validator, {ValidationError, ValidationSchema} from 'fastest-validator';
import 'mocha';
import {isPromise} from 'util/types';
import {
  isConstrainedModuleDefinition,
  isModuleDefinition,
  loadFromModule,
  loadJSONFromPackage,
  loadJSONResource,
  LoadSchema,
  ModuleDefinition,
  ModuleResolution, TypeOf
} from '../publish/index.js';

let should = chai.should();
let expect = chai.expect;

const unreachableCode = false;

describe('app-utility tests', () => {
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
      it('should load via module default from commonjs bad-extended', done => {
        // Path relative to root of package, at test time this is relative to publish
        const result = loadFromModule<any>({
          moduleName: '../testing/bad-extended.cjs',
          moduleResolution: ModuleResolution.commonjs
        }, undefined, undefined, undefined);
        expect(result).to.exist;
        done();
      });

      it('should load a via module function from es extended', () => {
        const result = loadFromModule<any>({
          moduleName: '../testing/extended.js',
          functionName: 'create2',
          moduleResolution: ModuleResolution.es
        }, undefined, undefined, undefined);
        expect(result).to.exist;
        isPromise(result).should.be.true;
        return result.then(res => {
          res.name.should.equal('Test');
        }, err => {
          unreachableCode.should.be.true;
        });
      });
      it('should load a via module constructor from es extended', () => {
        const result = loadFromModule<any>({
          moduleName: '../testing/extended.js',
          constructorName: 'TestDataType',
          moduleResolution: ModuleResolution.es
        }, undefined, undefined, undefined);
        expect(result).to.exist;
        isPromise(result).should.be.true;
        return result.then(res => {
          return res.name.should.equal('Test');
        }, err => {
          console.error(err);
          unreachableCode.should.be.true;
          return err;
        })
          .catch(err => {
            unreachableCode.should.be.true;
          });

      });
      it('should load json with no schema check', done => {
        const testJsonObj: any = loadJSONResource('../testing/test-json.json', undefined, undefined);
        (typeof testJsonObj).should.equal('object');
        testJsonObj.name.should.exist;
        testJsonObj.id.should.exist;
        done();
      });
      it('should load json with passing schema check', () => {
        const schema: LoadSchema = {
          validationSchema: {
            name: {type: 'string'},
            id: {type: 'number'}
          },
          useNewCheckerFunction: false
        };
        try {
          const testJsonObj: any = loadJSONResource('../testing/test-json.json', schema, undefined);
          (typeof testJsonObj).should.equal('object');
          testJsonObj.name.should.exist;
          testJsonObj.id.should.exist;
        } catch (err) {
          console.error(err);
          unreachableCode.should.be.true;
        }
      });
      it('should load json with failing schema check', () => {
        const schema: LoadSchema = {
          validationSchema: {
            name: {type: 'string'},
            id: {type: 'number'},
            doIt: {type: 'string'}
          },
          useNewCheckerFunction: false
        };
        try {
          const testJsonObj: any = loadJSONResource('../testing/test-json.json', schema, undefined);
          unreachableCode.should.be.true;
        } catch (err) {
          console.error(err);
          err.should.exist;
        }
      });
      it('should load json with async schema check', () => {
        const schema: LoadSchema = {
          validationSchema: {
            $$async: true,
            name: {type: 'string'},
            id: {type: 'number'},
            label: {
              type: 'string',
              custom: async (v, errors: ValidationError[]) => {
                if (v !== 'A') {
                  errors.push({type: 'unique', actual: v, field: 'label', expected: 'A'});
                }
                return v;
              }
            }
          },
          useNewCheckerFunction: true
        };
        const testJsonObj: any = loadJSONResource('../testing/test-json.json', schema, undefined);
        isPromise(testJsonObj).should.be.true;
        return testJsonObj.then(obj => {
          obj.label.should.equal('A');
        });
      });
      it('should load json with async schema fail', () => {
        const schema: LoadSchema = {
          validationSchema: {
            $$async: true,
            name: {type: 'string'},
            id: {type: 'number'},
            label: {
              type: 'string',
              custom: async (v, errors: ValidationError[]) => {
                if (v !== 'B') {
                  errors.push({
                    type: 'unique',
                    actual: v,
                    field: 'label',
                    expected: 'B',
                    message: 'Wrong value for label'
                  });
                }
                return v;
              }
            }
          },
          useNewCheckerFunction: true
        };
        const testJsonObj: any = loadJSONResource('../testing/test-json.json', schema, undefined);
        isPromise(testJsonObj).should.be.true;
        return testJsonObj.then(obj => {
          unreachableCode.should.be.true;
        }, err => {
          console.error(err);
          err.should.exist;
        });
      });
      it('should load json with compiled async check', () => {
        const schema: ValidationSchema = {
          $$async: true,
          name: {type: 'string'},
          id: {type: 'number'},
          label: {
            type: 'string',
            custom: async (v, errors: ValidationError[]) => {
              if (v !== 'A') {
                errors.push({type: 'unique', actual: v, field: 'label', expected: 'A'});
              }
              return v;
            }
          }
        };
        const check = (new Validator({useNewCustomCheckerFunction: true})).compile(schema);
        const testJsonObj: any = loadJSONResource('../testing/test-json.json', check, undefined);
        isPromise(testJsonObj).should.be.true;
        return testJsonObj.then(obj => {
          obj.label.should.equal('A');
        });
      });
      it('should load a via module function from es extended with successful schema check on moduleDef', () => {
        const schema: LoadSchema = {
          validationSchema: {
              name: {type: 'string'}
          },
          useNewCheckerFunction: true
        }
        const result = loadFromModule<any>({
          moduleName: '../testing/extended.js',
          functionName: 'create2',
          moduleResolution: ModuleResolution.es,
          loadSchema: schema
        }, undefined, undefined, undefined);
        expect(result).to.exist;
        isPromise(result).should.be.true;
        return result.then(res => {
          res.name.should.equal('Test');
        }, err => {
          unreachableCode.should.be.true;
        });
      });
      it('should load a via module function from es extended with unsuccessful schema check on moduleDef', () => {
        const schema: LoadSchema = {
          validationSchema: {
            name: {type: 'string'},
            dummy: {type: 'number'}
          },
          useNewCheckerFunction: true
        }
        const result = loadFromModule<any>({
          moduleName: '../testing/extended.js',
          functionName: 'create2',
          moduleResolution: ModuleResolution.es,
          loadSchema: schema
        }, undefined, undefined, undefined);
        expect(result).to.exist;
        isPromise(result).should.be.true;
        return result.then(res => {
          unreachableCode.should.be.true;
        }, err => {
          err.should.exist;
        });
      });
      it('should load a via module function from es extended, deep nested function name', () => {
        const result = loadFromModule<any>({
          moduleName: '../testing/extended.js',
          functionName: 'foo.bar',
          moduleResolution: ModuleResolution.es
        }, undefined, undefined, undefined);
        expect(result).to.exist;
        isPromise(result).should.be.true;
        return result.then(res => {
          res.id.should.equal(15);
        }, err => {
          unreachableCode.should.be.true;
        });
      });
      it ('should load jason from module property', () => {
        const moduleDef: ModuleDefinition = {
          moduleName: '@franzzemen/test',
          propertyName: 'jsonStr',
          moduleResolution: ModuleResolution.es
        }
        const objPromise = loadJSONFromPackage(moduleDef);
        objPromise.should.exist;
        if(isPromise(objPromise)) {
          objPromise
            .then(obj => {
              obj['prop'].should.equal('jsonStr');
            }, err=> {
              unreachableCode.should.be.true;
            })
        } else {
          unreachableCode.should.be.true;
        }
      })
      it ('should load jason from deep nested module property', () => {
        const moduleDef: ModuleDefinition = {
          moduleName: '@franzzemen/test',
          propertyName: 'nestedJsonStr.jsonStr',
          moduleResolution: ModuleResolution.es
        }
        const objPromise = loadJSONFromPackage(moduleDef);
        objPromise.should.exist;
        if(isPromise(objPromise)) {
          objPromise
            .then(obj => {
              obj['prop'].should.equal('jsonStr');
            }, err => {
              unreachableCode.should.be.true;
            });
        } else {
          objPromise['prop'].should.equal('jsonStr');
        }
      })
      it ('should load object from package', () => {
        const moduleDef: ModuleDefinition = {
          moduleName: '@franzzemen/test',
          functionName:'getObj',
          moduleResolution: ModuleResolution.es
        }
        const objPromise = loadFromModule(moduleDef);
        objPromise.should.exist;
        if (isPromise(objPromise)) {
          objPromise
            .then(obj => {
              obj['name'].should.equal('test');
            }, err => {
              unreachableCode.should.be.true;
            })
        } else {
          unreachableCode.should.be.true;
        }
      })
      it ('should load object from package with factory function parameters', () => {
        const moduleDef: ModuleDefinition = {
          moduleName: '@franzzemen/test',
          functionName:'getObjWithParameters',
          moduleResolution: ModuleResolution.es
        }
        const objPromise = loadFromModule(moduleDef, ['year', 1999]);
        objPromise.should.exist;
        if (isPromise(objPromise)) {
          objPromise
            .then(obj => {
              obj['label'].should.equal('year');
              obj['id'].should.equal(1999);
            }, err => {
              unreachableCode.should.be.true;
            })
        } else {
          unreachableCode.should.be.true;
        }
      })
      it('should load a via module function from es extended with successful TypeOf check', () => {
        const result = loadFromModule<string>({
          moduleName: '../testing/extended.js',
          functionName: 'createString',
          moduleResolution: ModuleResolution.es
        }, undefined, TypeOf.String, undefined);
        expect(result).to.exist;
        isPromise(result).should.be.true;
        if(isPromise(result)) {
          return result.then(res => {
            expect(res).to.equal('hello world');
            return;
          }, err => {
            console.error(err);
            unreachableCode.should.be.true;
          });
        }
      });
      it('should load a via module function from es extended with unsuccessful TypeOf check', () => {

        const result = loadFromModule<string>({
          moduleName: '../testing/extended.js',
          functionName: 'createString',
          moduleResolution: ModuleResolution.es
        }, undefined, TypeOf.Number, undefined);
        expect(result).to.exist;
        isPromise(result).should.be.true;
        if(isPromise(result)) {
          return result.then(res => {
            unreachableCode.should.be.true;
            return;
          }, err => {
            err.should.exist;
            err.message.startsWith('TypeOf').should.be.true;
          });
        }
      });
    });
  });
});
