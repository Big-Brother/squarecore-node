'use strict';

var should = require('chai').should();

describe('Index Exports', function() {
  it('will export squarecore-lib', function() {
    var squarecore = require('../');
    should.exist(squarecore.lib);
    should.exist(squarecore.lib.Transaction);
    should.exist(squarecore.lib.Block);
  });
});
