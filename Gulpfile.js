const series = require('gulp').series;
const src = require('gulp').src;
const gulpBase = require('@franzzemen/gulp-base').init(require('./package.json'), 100, true);
const mocha = require('gulp-mocha');
require('@franzzemen/gulp-base').setMainBranch('main');

function test ()  {
  return src('./testing/**/*.test.js')
    .pipe(mocha());
}


exports.buildTest = gulpBase.buildTest;
exports.test = test;

exports.default = gulpBase.default;

exports.patch = gulpBase.patch;
exports.minor = gulpBase.minor;
exports.major = gulpBase.major;

exports.npmForceUpdateProject = gulpBase.npmForceUpdateProject;
exports.npmUpdateProject = gulpBase.npmUpdateProject;
