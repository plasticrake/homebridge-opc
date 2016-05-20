'use strict';

var tinycolor = require('tinycolor2');
var tinygradient = require('tinygradient');
var net = require('net');
var OpcClientStream = require('openpixelcontrol-stream').OpcClientStream;

var Service, Characteristic;

module.exports = function (homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;

  homebridge.registerAccessory('homebridge-opc', 'OpcAccessory', OpcAccessory);
};

function OpcAccessory (log, config) {

  this.log = log;

  this.host = config['host'];
  this.port = config['port'];

  this.data = {};
  this.data.lightbulbs = config['strands'];

  this.data.lightbulbs.sort((a, b) => {
    if (a.firstPixelIndex > b.firstPixelIndex) {
      return 1;
    }
    if (a.firstPixelIndex < b.firstPixelIndex) {
      return -1;
    }
    return 0;
  });

  this.pixelCount = this.data.lightbulbs[this.data.lightbulbs.length-1].lastPixelIndex + 1;

  this.lightbulbServices = [];
  this.data.lightbulbs.forEach( (e, i) => {
    var s = new Service.Lightbulb(config['name'] + ' ' + i, i);
    s.dataIndex = i;
    this.lightbulbServices.push(s);
    this.setupLightbulbService(s);
  });

}


OpcAccessory.prototype = {

  getValue: function (service, characteristic, callback) {
    var value;
    var d = this.data.lightbulbs[service.dataIndex];
    switch (characteristic.toLowerCase()) {
      case 'on':         value = d.on; break; // eslint-disable-line no-multi-spaces
      case 'brightness': value = d.brightness; break; // eslint-disable-line no-multi-spaces
      case 'hue':        value = d.hue; break; // eslint-disable-line no-multi-spaces
      case 'saturation': value = d.saturation; break; // eslint-disable-line no-multi-spaces
      default:           this.log('Invalid characteristic: ' + characteristic);
    }
    callback(null, value);
  },

  setValue: function (service, characteristic, value, callback) {
    var d = this.data.lightbulbs[service.dataIndex];
    switch (characteristic.toLowerCase()) {
      case 'on':         d.on = (value === 1 || value === true || value === 'true'); break; // eslint-disable-line no-multi-spaces
      case 'brightness': d.brightness = Number(value); break; // eslint-disable-line no-multi-spaces
      case 'hue':        d.hue = Number(value); break; // eslint-disable-line no-multi-spaces
      case 'saturation': d.saturation = Number(value); break; // eslint-disable-line no-multi-spaces
      default:           this.log('Invalid characteristic: ' + characteristic);
    }
    this.sendColor();
    callback();
  },

  identify: function (callback) {
    // TODO
    callback();
  },

  sendOpcData: function () {

    this.opcClient.pipe(this.socket);

    var pixelData = new Uint32Array(this.pixelCount);

    this.data.lightbulbs.forEach((d, lightbulbIndex) => {

      var c = getColor(d);
      var rgbInt = rgb2Int(c.toRgb());
      var i;

      // Set color for light segment
      for (i = d.firstPixelIndex; i <= d.lastPixelIndex; i++) {
        pixelData[i] = rgbInt;
      }

      // Set gradient colors in between this light segment and the start of the next
      var d2 = this.data.lightbulbs[lightbulbIndex+1];
      if (d2) {
        var gapLength = d2.firstPixelIndex - d.lastPixelIndex - 1;
        if (gapLength > 0) {
          var c2 = getColor(d2);
          var g = tinygradient([c.toRgb(), c2.toRgb()]); // not sure why needs toRgb
          var gColors = g.rgb(gapLength + 2); // Includes start and end (+2)
          for (i = 0; i < gapLength + 1; i++) { // Includes start (+1)
            pixelData[d.lastPixelIndex + i] = rgb2Int(gColors[i].toRgb());
          }
        }
      }
    });

    this.opcClient.setPixelColors(0, pixelData);
    //this.opcClient.setPixelColors(0, pixelData); // sending twice otherwise it will slowly fade

    this.log('Colors: ' + pixelData.join(', '));
  },

  sendColor: function () {

    if (this.socket && this.socket.writable) {
      this.log('Reusing Socket');
      this.sendOpcData();
    } else {
      this.log('Creating Socket');

      this.socket = net.connect(this.port, this.host);
      this.opcClient = new OpcClientStream();

      this.socket.on('connect', () => {
        this.log('Socket connected');
        this.sendOpcData();
      });

      this.socket.on('end', () => {
        this.log('Socket end');
      });

      this.socket.on('error', (err) => {
        this.log('Socket error: ' + err);
      });

    }

  }

};

OpcAccessory.prototype.getServices = function () {
  return this.lightbulbServices;
};


OpcAccessory.prototype.setupLightbulbService = function (service) {
  var self = this;

  service
  .getCharacteristic(Characteristic.On)
  .on('get', function (callback) { self.getValue(service, 'on', callback); })
  .on('set', function (value, callback, context) { self.setValue(service, 'on', value, callback, context); });

  service
  .addCharacteristic(Characteristic.Brightness)
  .on('get', function (callback) { self.getValue(service, 'brightness', callback); })
  .on('set', function (value, callback, context) { self.setValue(service, 'brightness', value, callback, context); });

  service
  .addCharacteristic(Characteristic.Hue)
  .on('get', function (callback) { self.getValue(service, 'hue', callback); })
  .on('set', function (value, callback, context) { self.setValue(service, 'hue', value, callback, context); });

  service
  .addCharacteristic(Characteristic.Saturation)
  .on('get', function (callback) { self.getValue(service, 'saturation', callback); })
  .on('set', function (value, callback, context) { self.setValue(service, 'saturation', value, callback, context); });

};

function getColor (d) {
  if (d.on) {
    return tinycolor({h: d.hue || 0, s: d.saturation || 0, v: d.brightness || 0});
  }
  return tinycolor({r: 0, g: 0, b: 0});
}


function rgb2Int(rgb) {
  return ((rgb.r & 0xff) << 16) + ((rgb.g & 0xff) << 8) + (rgb.b & 0xff);
}
