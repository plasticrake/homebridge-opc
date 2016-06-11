var rewire = require('rewire');
var chai = require('chai');
chai.should();

var pixels = require('./fixture/pixels.json');

var app = rewire('../index.js');

var parsePixels = app.__get__('parsePixels');

describe('Config Parsing', function() {

  var channels;

  beforeEach(function () {
    channels = [];
  });

  it('should parse individual', function () {
    parsePixels(pixels['pixels-8-individual'], channels).should.eql(pixels['pixels-8-individual']);
  });

  it('should parse range', function () {
    parsePixels(pixels['pixels-8-individual-range'], channels).should.eql(pixels['pixels-8-individual']);
    parsePixels(pixels['pixels-8-range'], channels).should.eql(pixels['pixels-8']);
    parsePixels(pixels['pixels-6x6-groups-range'], channels).should.eql(pixels['pixels-6x6-groups']);
  });

  it('should parse reverse range', function () {
    parsePixels(pixels['pixels-6x6-zigzag-range'], channels).should.eql(pixels['pixels-6x6-zigzag']);
  });

});
