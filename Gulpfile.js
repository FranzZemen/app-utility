const series = require('gulp').series;
const src = require('gulp').src;
const gulpBase = require('@franzzemen/gulp-base').init(require('./package.json'), 100, true);
const mocha = require('gulp-mocha');
const {join} = require('path');
require('@franzzemen/gulp-base').setMainBranch('main');

const npmu = require('@franzzemen/npmu').npmu;

exports.npmu = (cb) => npmu([
  {
    path: join(__dirname, '../gulp-base'), packageName: '@franzzemen/gulp-base',
  }, {
    path: join(__dirname, '../gulp-base'), packageName: '@franzzemen/npmu',
  }])
  .then(() => {
console.log('cb...');
cb();
});


function test ()  {
  return src('./testing/**/*.test.js').pipe(mocha());
}




exports.buildTest = gulpBase.buildTest;
exports.test = test;

exports.default = gulpBase.default;

exports.patch = gulpBase.patch;
exports.minor = gulpBase.minor;
exports.major = gulpBase.major;

exports.npmForceUpdateProject = gulpBase.npmForceUpdateProject;
exports.npmUpdateProject = gulpBase.npmUpdateProject;
