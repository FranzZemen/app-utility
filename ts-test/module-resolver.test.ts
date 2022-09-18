import chai from 'chai';
import 'mocha';
import {LoadPackageType, ModuleResolution, ModuleResolver, PendingModuleResolution} from '../publish/index.js';


const should = chai.should();
const expect = chai.expect;

const unreachableCode = false;

describe('app-utility tests', () => {
  describe('module resolver tests', () => {
    describe('module-resolver', () => {
      describe('loadPackageType=json', () => {
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
      });
    })
  })
});
