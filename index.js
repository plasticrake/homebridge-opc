'use strict';

var net = require('net');
var _ = require('lodash');
var OpcClientStream = require('openpixelcontrol-stream').OpcClientStream;
var tinycolor = require('tinycolor2');
var tinygradient = require('tinygradient');

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

  this.lightbulbs = config['lightbulbs'];
  this.gradients = config['gradients'] || [];
  this.fadeDuration = config['fadeDuration'] || 0;
  this.fadeOnDuration = config['fadeOnDuration'] || this.fadeDuration;
  this.fadeOffDuration = config['fadeOffDuration'] || this.fadeDuration;

  this.channels = [];
  this.lightbulbServices = [];
  this.lightbulbs.forEach( (l, i) => {
    var s = new Service.Lightbulb(l.name, i);
    l.pixels = parsePixels(l.map, this.channels);
    s.data = l;
    this.setupLightbulbService(s);
    this.lightbulbServices.push(s);
    this.log('Configured Lightbulb: %s: %j', l.name, l.pixels);
  });

  this.gradients.forEach( (g) => {
    g.lightbulbs = [];
    g.lightbulbNames.forEach( (lbn) => {
      g.lightbulbs.push(_.find(this.lightbulbs, ['name', lbn]));
    });
    g.name = _.map(g.lightbulbs, 'name').join(' - ');
    g.pixels = parsePixels(g.map, this.channels);

    this.log('Configured Gradient: %s: %j', g.name, g.pixels);
  });

  this.channels.forEach( (c) => {
    c.pixelData = new Uint32Array(c.pixelCount);
  });

  this.log('Configured Channels: %j', this.channels);

}


OpcAccessory.prototype = {

  getValue: function (service, characteristic, callback) {
    var value;
    switch (characteristic.toLowerCase()) {
      case 'on':         value = service.data.on; break; // eslint-disable-line no-multi-spaces
      case 'brightness': value = service.data.brightness; break; // eslint-disable-line no-multi-spaces
      case 'hue':        value = service.data.hue; break; // eslint-disable-line no-multi-spaces
      case 'saturation': value = service.data.saturation; break; // eslint-disable-line no-multi-spaces
      default:           this.log('Invalid characteristic: %s', characteristic);
    }
    callback(null, value);
  },

  setValue: function (service, characteristic, value, callback) {
    switch (characteristic.toLowerCase()) {
      case 'on':
        service.data.on = (value === 1 || value === true || value === 'true');
        this.sendColor((service.data.on ? this.fadeOnDuration : this.fadeOffDuration));
        break;
      case 'brightness':
        service.data.brightness = Number(value);
        this.sendColor(this.fadeDuration);
        break;
      case 'hue':
        service.data.hue = Number(value);
        this.sendColor(this.fadeDuration);
        break;
      case 'saturation':
        service.data.saturation = Number(value);
        this.sendColor(this.fadeDuration);
        break;
      default:
        this.log('Invalid characteristic: %s', characteristic);
    }

    callback();
  },

  identify: function (callback) {
    // TODO
    callback();
  },

  sendOpcData: function (fadeDuration) {

    this.channels.forEach( (c) => {
      c.oldPixelData = new Uint32Array(c.pixelData);
      c.pixelData = new Uint32Array(c.pixelCount);
    });

    // Set color for each pixel segment
    this.lightbulbs.forEach( (d) => {
      var c = getColorFromLightbulb(d);
      d.rgb = c.toRgb();
      d.rgbInt = rgbToInt(d.rgb);
      d.pixels.forEach( (p) => {
        this.channels[p[0]].pixelData[p[1]] = d.rgbInt;
      });
    });

    // Set color for each gradient segment
    this.gradients.forEach( (g) => {
      var tg = tinygradient(_.map(g.lightbulbs, 'rgb'));
      var gColors = tg.rgb(g.pixels.length + 2); // Includes start and end (+2)
      gColors = gColors.slice(1, -1); // Remove start and end
      g.pixels.forEach( (p, i) => {
        var gradRgb = rgbToInt(gColors[i].toRgb());
        p.forEach( (p) => {
          this.channels[p[0]].pixelData[p[1]] = gradRgb;
        });
      });
    });

    this.channels.forEach( (c, i) => {
      this.log('Channel: %d Colors: %j', i, c.pixelData);
    });

    if (fadeDuration > 0) {

      var fps = 30;
      var msPerFrame = fps / 1000;
      var progress = 0;
      var startTime = new Date();

      var timer = setInterval( () => {

        progress = (new Date() - startTime) / fadeDuration;
        if (progress >= 1) {
          progress = 1;
          clearInterval(timer);
        }

        this.channels.forEach( (c, i) => {
          if (c) {
            var pixelData = mixColors(c.oldPixelData, c.pixelData, progress);
            this.log('%s %d %d channel: %d pixelData: %j', ( progress < 1 ? 'Fade' : 'Fade Complete'), fadeDuration, progress, i, pixelData);
            this.opcClient.setPixelColors(i, pixelData);
          }
        });

      }, msPerFrame);

    } else {

      this.channels.forEach( (c, i) => {
        if (c) {
          this.opcClient.setPixelColors(i, c.pixelData);
          this.log('channel: %s pixelData: %j', i, c.pixelData);
        }
      });

    }

  },

  sendColor: function (fadeDuration) {

    if (this.socket && this.socket.writable) {
      this.sendOpcData(fadeDuration);
    } else {
      this.log('Creating Socket');

      this.socket = net.connect(this.port, this.host);
      this.opcClient = new OpcClientStream();

      this.socket.on('connect', () => {
        this.log('Socket connected');
        this.opcClient.pipe(this.socket);
        this.sendOpcData(fadeDuration);
      });

      this.socket.on('end', () => {
        this.log('Socket end');
      });

      this.socket.on('error', (err) => {
        this.log('Socket error: %s', err);
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

function getColorFromLightbulb (d) {
  if (d.on) {
    return tinycolor({h: d.hue || 0, s: d.saturation || 0, v: d.brightness || 0});
  }
  return tinycolor({r: 0, g: 0, b: 0});
}

function rgbToInt (rgb) {
  return ((rgb.r & 0xff) << 16) + ((rgb.g & 0xff) << 8) + (rgb.b & 0xff);
}

function intToRgb (n) {
  return { r: ((n >> 16) & 0xff), g: ((n >> 8) & 0xff), b: (n & 0xff) };
}

function mixColors (a0, a1, t) {
  var mix = new Uint32Array(a0.length);
  for (var i = 0; i < a0.length; i++) {
    mix[i] = rgbToInt(tinycolor.mix(intToRgb(a0[i]), intToRgb(a1[i]), t*100).toRgb());
  }
  return mix;
}

function parsePixels (pixels, channels) {

  var channelFn = function (channel, first, len) {
    if (!channels[channel] || !channels[channel].pixelCount) { channels[channel] = { pixelCount: 0 }; }
    channels[channel].pixelCount = Math.max(channels[channel].pixelCount, Math.max(first, first+len)+1);
  };

  var recurseFn = function (pixels) {
    var parsedPixels = [];
    pixels.forEach( (p) => {
      if (Array.isArray(p)) {
        if (Array.isArray(p[0])) {
          parsedPixels.push(recurseFn(p));
        } else {
          if (p.length === 2) {
            parsedPixels.push(p);
            channelFn(p[0], p[1], 0);
          } else if (p.length === 3 || p.length === 4) {
            // Range
            var i;
            var pixelIndex;
            var channel = p[0];
            var first = p[1];
            var len = p[2];
            var stepLen = p[3];
            channelFn(channel, first, len);

            // Forward or Reverse Loop depending on sign of len
            if (!stepLen) {
              for (i = 0; i < Math.abs(len); i++) {
                pixelIndex = first + i * Math.sign(len);
                parsedPixels.push([channel, pixelIndex]);
              }
            } else {
              for (i = 0; i < Math.abs(len); i += stepLen) {
                pixelIndex = first + i * Math.sign(len);
                if (stepLen === 1) {
                  parsedPixels.push([ [channel, pixelIndex] ]);
                } else {
                  if (pixelIndex + stepLen > first + len) {
                    // clamp to end of gradient length
                    stepLen = (first + len) - pixelIndex;
                  }
                  parsedPixels.push(recurseFn( [[channel, pixelIndex, stepLen]] ));
                }
              }
            }

          }
        }
      }
    });
    return parsedPixels;
  };
  var parsedPixels = recurseFn(pixels);

  return parsedPixels;

}
