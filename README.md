# homebridge-opc
[![NPM Version](https://img.shields.io/npm/v/homebridge-opc.svg)](https://www.npmjs.com/package/homebridge-opc)

Open Pixel Control (OPC) plugin for [Homebridge](https://github.com/nfarina/homebridge).

# Installation

1. Install homebridge using: npm install -g homebridge
2. Install this plugin using: npm install -g homebridge-opc
3. Update your configuration file. See the sample below.

# Updating

- npm update -g homebridge-opc

# Configuration

Each strand will show as a separate lightbulb. If there are gaps between strand indexes they are filled with a smooth gradient. For example you can set one strand at pixel 0 and the second at pixel 63 and pixels 1-62 will be a gradient between the two colors.

Configuration sample:

 ```
 "accessories": [{
     "accessory": "OpcAccessory",
     "name": "Light Strip",
     "host": "localhost",
     "port": 7890,
     "strands": [
       {
         "firstPixelIndex": 0,
         "lastPixelIndex": 8
       },
       {
         "firstPixelIndex": 27,
         "lastPixelIndex": 35
       },
       {
         "firstPixelIndex": 63,
         "lastPixelIndex": 63
       }
     ]
 }]
```
