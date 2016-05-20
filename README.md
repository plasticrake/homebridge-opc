# homebridge-opc
OPC (Open Pixel Control) plugin for homebridge: https://github.com/nfarina/homebridge

# Installation

1. Install homebridge using: npm install -g homebridge
2. Install this plugin using: npm install -g homebridge-opc
3. Update your configuration file. See the sample below.

# Configuration

Configuration sample:

 ```
 "accessories": [{
     "accessory": "OpcAccessory",
     "name": "Light Strip",
     "pixelCount": 64,
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
