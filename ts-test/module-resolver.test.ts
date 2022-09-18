import chai from 'chai';
import 'mocha';
import Validator, {ValidationError, ValidationSchema} from 'fastest-validator';
import {isPromise} from 'util/types';
import {
  CheckFunction, ExecutionContextI, loadFromModule, loadJSONFromPackage,
  loadJSONResource,
  LoadPackageType, LoadSchema, ModuleDefinition,
  ModuleResolution,
  ModuleResolver,
  PendingModuleResolution, TypeOf
} from '../publish/index.js';


const should = chai.should();
const expect = chai.expect;

const unreachableCode = false;

describe('app-utility tests', () => {
  describe('module resolver tests', () => {
    describe('module-resolver', () => {
      describe('module resolution = json', () => {
        it('should load json with no schema check', () => {
          let testJsonObj;

          function setJSON(_jsonObj): true {
            testJsonObj = _jsonObj
            return true;
          }

          const pendingResolution: PendingModuleResolution = {
            ownerIsObject: false,
            ownerThis: undefined,
            ownerSetter: setJSON,
            module: {
              moduleName: '../testing/test-json.json',
              moduleResolution: ModuleResolution.json
            },
            loadPackageType: LoadPackageType.json
          };
          const resolver = new ModuleResolver();
          resolver.add(pendingResolution);
          const promise = resolver.resolve();
          return promise
            .then(values => {
              (typeof testJsonObj).should.equal('object');
              testJsonObj.name.should.exist;
              testJsonObj.id.should.equal(1);
              testJsonObj.name.should.equal('Franz');
              testJsonObj.id.should.exist;
            });
        });

        it('should load json with passing schema check', () => {
          let testJsonObj;

          function setJSON(_jsonObj): true {
            testJsonObj = _jsonObj
            return true;
          }

          const pendingResolution: PendingModuleResolution = {
            ownerIsObject: false,
            ownerThis: undefined,
            ownerSetter: setJSON,
            module: {
              moduleName: '../testing/test-json.json',
              moduleResolution: ModuleResolution.json,
              loadSchema: {
                validationSchema: {
                  name: {type: 'string'},
                  id: {type: 'number'}
                },
                useNewCheckerFunction: false
              }
            },
            loadPackageType: LoadPackageType.json
          };
          const resolver = new ModuleResolver();
          resolver.add(pendingResolution);
          const promise = resolver.resolve();
          return promise
            .then(values => {
              expect(values[0].error).to.be.undefined;
              values[0].resolved.should.be.true;
              values[0].loaded.should.be.true;
              (typeof testJsonObj).should.equal('object');
              testJsonObj.name.should.exist;
              testJsonObj.id.should.equal(1);
              testJsonObj.name.should.equal('Franz');
              testJsonObj.id.should.exist;
            });
        });

        it('should load json with failing schema check', () => {
          let testJsonObj;

          function setJSON(_jsonObj): true {
            testJsonObj = _jsonObj
            return true;
          }

          const pendingResolution: PendingModuleResolution = {
            ownerIsObject: false,
            ownerThis: undefined,
            ownerSetter: setJSON,
            module: {
              moduleName: '../testing/test-json.json',
              moduleResolution: ModuleResolution.json,
              loadSchema: {
                validationSchema: {
                  name: {type: 'string'},
                  id: {type: 'number'},
                  doIt: {type: 'string'}
                },
                useNewCheckerFunction: false
              }
            },
            loadPackageType: LoadPackageType.json
          };
          const resolver = new ModuleResolver();
          resolver.add(pendingResolution);
          const promise = resolver.resolve();
          return promise
            .then(values => {
              values.length.should.equal(1);
              const result = values[0];
              expect(result.error).to.exist;
              result.resolved.should.be.false;
              result.loaded.should.be.false;
            });
        });
        it('should load json with async schema check', () => {
          let testJsonObj;

          function setJSON(_jsonObj): true {
            testJsonObj = _jsonObj
            return true;
          }

          const pendingResolution: PendingModuleResolution = {
            ownerIsObject: false,
            ownerThis: undefined,
            ownerSetter: setJSON,
            module: {
              moduleName: '../testing/test-json.json',
              moduleResolution: ModuleResolution.json,
              loadSchema: {
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
              }
            },
            loadPackageType: LoadPackageType.json
          };
          const resolver = new ModuleResolver();
          resolver.add(pendingResolution);
          const promise = resolver.resolve();
          return promise
            .then(values => {
              expect(values[0].error).to.be.undefined;
              values[0].resolved.should.be.true;
              values[0].loaded.should.be.true;
              (typeof testJsonObj).should.equal('object');
              testJsonObj.name.should.exist;
              testJsonObj.id.should.equal(1);
              testJsonObj.name.should.equal('Franz');
              testJsonObj.id.should.exist;
            });
        });
        it('should load json with async schema fail', () => {
          let testJsonObj;

          function setJSON(_jsonObj): true {
            testJsonObj = _jsonObj
            return true;
          }

          const pendingResolution: PendingModuleResolution = {
            ownerIsObject: false,
            ownerThis: undefined,
            ownerSetter: setJSON,
            module: {
              moduleName: '../testing/test-json.json',
              moduleResolution: ModuleResolution.json,
              loadSchema: {
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
              }
            },
            loadPackageType: LoadPackageType.json
          };
          const resolver = new ModuleResolver();
          resolver.add(pendingResolution);
          const promise = resolver.resolve();
          return promise
            .then(values => {
              values.length.should.equal(1);
              const result = values[0];
              expect(result.error).to.exist;
              result.resolved.should.be.false;
              result.loaded.should.be.false;
            });
        });

        it('should load json with compiled async check', () => {
          let testJsonObj;

          function setJSON(_jsonObj): true {
            testJsonObj = _jsonObj
            return true;
          }
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
          const loadSchema: CheckFunction = (new Validator({useNewCustomCheckerFunction: true})).compile(schema);

          const pendingResolution: PendingModuleResolution = {
            ownerIsObject: false,
            ownerThis: undefined,
            ownerSetter: setJSON,
            module: {
              moduleName: '../testing/test-json.json',
              moduleResolution: ModuleResolution.json,
              loadSchema
            },
            loadPackageType: LoadPackageType.json
          };
          const resolver = new ModuleResolver();
          resolver.add(pendingResolution);
          const promise = resolver.resolve();
          return promise
            .then(values => {
              expect(values[0].error).to.be.undefined;
              values[0].resolved.should.be.true;
              values[0].loaded.should.be.true;
              (typeof testJsonObj).should.equal('object');
              testJsonObj.name.should.exist;
              testJsonObj.id.should.equal(1);
              testJsonObj.name.should.equal('Franz');
              testJsonObj.id.should.exist;
            });
        });
      });
      describe('loadPackageType=json and moduleResolution=es', () => {
        it('should resolve loading JSON from a package and setting an object', () => {
          class A {
            public jsonObj;

            setJSON(jsonObj) {
              this.jsonObj = jsonObj;
            }
          }

          const a = new A();
          const pendingResolution: PendingModuleResolution = {
            ownerIsObject: true,
            ownerThis: a,
            ownerSetter: 'setJSON',
            module: {
              moduleName: '@franzzemen/test',
              propertyName: 'nestedJsonStr.jsonStr',
              moduleResolution: ModuleResolution.es
            },
            loadPackageType: LoadPackageType.json
          };
          const resolver = new ModuleResolver();
          resolver.add(pendingResolution);
          const promise = resolver.resolve();
          return promise
            .then(values => {
              values.length.should.equal(1);
              values[0].resolvedObject['prop'].should.equal('jsonStr');
              ('prop' in a.jsonObj).should.be.true;
              a.jsonObj.prop.should.equal('jsonStr');
            }, err => {
              console.log(err);
              unreachableCode.should.be.false;
            })
        })
        it('should resolve loading JSON from a package and setting an object with extra params [5,"abc"]', () => {
          class A {
            public jsonObj;
            public num;
            public str;

            setJSON(jsonObj, aNum, aStr) {
              this.jsonObj = jsonObj;
              this.num = aNum;
              this.str = aStr;
            }
          }

          const a = new A();
          const pendingResolution: PendingModuleResolution = {
            ownerIsObject: true,
            ownerThis: a,
            ownerSetter: 'setJSON',
            module: {
              moduleName: '@franzzemen/test',
              propertyName: 'nestedJsonStr.jsonStr',
              moduleResolution: ModuleResolution.es
            },
            loadPackageType: LoadPackageType.json,
            paramsArray: [5, 'abc']
          };
          const resolver = new ModuleResolver();
          resolver.add(pendingResolution);
          const promise = resolver.resolve();
          return promise
            .then(values => {
              values.length.should.equal(1);
              values[0].resolvedObject['prop'].should.equal('jsonStr');
              ('prop' in a.jsonObj).should.be.true;
              a.jsonObj.prop.should.equal('jsonStr');
              a.num.should.equal(5);
              a.str.should.equal('abc');
            }, err => {
              console.log(err);
              unreachableCode.should.be.false;
            })
        })
        it('should resolve loading JSON from a package and setting a function', () => {
          let jsonObj;

          function setJSON(_jsonObj): true {
            jsonObj = _jsonObj
            return true;
          }

          const pendingResolution: PendingModuleResolution = {
            ownerIsObject: false,
            ownerThis: undefined,
            ownerSetter: setJSON,
            module: {
              moduleName: '@franzzemen/test',
              propertyName: 'nestedJsonStr.jsonStr',
              moduleResolution: ModuleResolution.es
            },
            loadPackageType: LoadPackageType.json
          };
          const resolver = new ModuleResolver();
          resolver.add(pendingResolution);
          const promise = resolver.resolve();
          return promise
            .then(values => {
              values.length.should.equal(1);
              values[0].resolvedObject['prop'].should.equal('jsonStr');
              jsonObj.prop.should.equal('jsonStr');
            }, err => {
              console.log(err);
              unreachableCode.should.be.false;
            })
        })
        it('should resolve loading JSON from a package and setting a function with extra params [5,"abc"]', () => {
          let jsonObj;
          let num: number;
          let str: string;

          function setJSON(_jsonObj, aNum, aStr): true {
            jsonObj = _jsonObj
            num = aNum;
            str = aStr;
            return true;
          }

          const pendingResolution: PendingModuleResolution = {
            ownerIsObject: false,
            ownerThis: undefined,
            ownerSetter: setJSON,
            module: {
              moduleName: '@franzzemen/test',
              propertyName: 'nestedJsonStr.jsonStr',
              moduleResolution: ModuleResolution.es
            },
            loadPackageType: LoadPackageType.json,
            paramsArray: [5, 'abc']
          };
          const resolver = new ModuleResolver();
          resolver.add(pendingResolution);
          const promise = resolver.resolve();
          return promise
            .then(values => {
              values.length.should.equal(1);
              values[0].resolvedObject['prop'].should.equal('jsonStr');
              jsonObj.prop.should.equal('jsonStr');
              num.should.equal(5);
              str.should.equal('abc');
              resolver.clear();
              resolver.pendingResolutions.length.should.equal(0);
              resolver.moduleResolutionPromises.length.should.equal(0);
            }, err => {
              console.log(err);
              unreachableCode.should.be.false;
            })
        })
      });
      describe('loadPackageType=object', () => {
        it('should load a via module function from es extended with successful schema check on moduleDef', () => {
          let obj;

          function setObj(_obj): true {
            obj = _obj;
            return true;
          }

          const pendingResolution: PendingModuleResolution = {
            ownerIsObject: false,
            ownerThis: undefined,
            ownerSetter: setObj,
            module: {
              moduleName: '../testing/extended.js',
              functionName: 'create2',
              moduleResolution: ModuleResolution.es,
              loadSchema: {
                validationSchema: {
                  name: {type: 'string'}
                },
                useNewCheckerFunction: true
              }
            },
            loadPackageType: LoadPackageType.package
          };
          const resolver = new ModuleResolver();
          resolver.add(pendingResolution);
          const promise = resolver.resolve();
          return promise
            .then(values => {
              values.length.should.equal(1);
              const result = values[0];
              expect(result.resolvedObject['name']).to.equal('Test');
            }, err => {
              console.log(err);
              unreachableCode.should.be.false;
            })
        });
        it('should load promise via module default from commonjs bad-extended, for function name createAsyncFunc', () => {
          let obj;

          function setObj(_obj): true {
            obj = _obj;
            return true;
          }

          const pendingResolution: PendingModuleResolution = {
            ownerIsObject: false,
            ownerThis: undefined,
            ownerSetter: setObj,
            module: {
              moduleName: '../testing/bad-extended.cjs',
              moduleResolution: ModuleResolution.commonjs,
              functionName: 'createAsyncFunc'
            },
            loadPackageType: LoadPackageType.package
          };
          const resolver = new ModuleResolver();
          resolver.add(pendingResolution);
          const promise = resolver.resolve();
          return promise
            .then(values => {
              values.length.should.equal(1);
              const result = values[0];
              expect(result.resolvedObject).to.equal(50);
            }, err => {
              console.log(err);
              unreachableCode.should.be.false;
            })
        });
      });
    })
  })
});
