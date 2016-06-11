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

## Lightbulbs
Pixel segments are exposed as a lightbulb in HomeKit with the lightbulbs configuration.

```json
"lightbulbs": [
  { "name": "Strand", "map": [ [0, 0, 10] ] }
]
```

The map property is similar to the FadeCandy server map configuration:

* [ *OPC Channel*, *First OPC Pixel*, *Pixel count* ]
  * Pixel count is optional and will default to 1.

### Map Examples

Channel 0, pixels 0 through 3:
```javascript
"map": [ [ 0, 0, 4 ] ] // As a Range
"map": [ [0,0], [0,1], [0,2], [0,3] ] // Individual
```

Channel 1, pixels 3 through 8:
```javascript
"map": [ [ 1, 6, 3 ] ] // As a Range
"map": [ [1,6], [1,7], [1,8] ] // Individual
```

Channel 1, pixels 6 through 9:
```javascript
"map": [ [ 1, 6, 3 ], [1,9] ] // Range plus Individual
"map": [ [1,6], [1,7], [1,8], [1,9] ] // Individual
```

## Gradients
Pixel segments can also be set to a gradient between two lightbulb colors.

```json
"lightbulbs": [
  { "name": "Left",  "map": [ [0,0] ] },
  { "name": "Right", "map": [ [0,39] ] },
],

"gradients": [
  { "lightbulbNames": ["Left", "Right"], "map": [ [ 0, 1, 38, 1 ] ] }
]
```

The map property for gradients has an additional option Step Length. If omitted it defaults to 0.
* [ *OPC Channel*, *First OPC Pixel*, *Pixel count*, *Step length* ]

For a gradient 10 pixels long:
* Step Length of 0 will have 1 color: `1,2,3,4,5,6,7,8,9,10`
* Step Length of 1 will have 10 colors: `1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10`
* Step Length of 2 will have 5 colors: `1,2 | 3,4 | 5,6 | 7,8 | 9,10`
* Step Length of 3 will have 4 colors: `1,2,3 | 4,5,6 | 7,8,9 | 10`

## Fade Duration

Name             | Default      | Description
---------------- | ------------ | --------------------------------------------
fadeDuration     | 0            | Fade between color changes in ms (0 is instantaneous)
fadeOnDuration   | fadeDuration | Fade when turning a lightbulb on in ms (0 is instantaneous)
fadeOffDuration  | fadeDuration | Fade when turning a lightbulb off in ms (0 is instantaneous)

## Sample Configurations

* Minimal configuration, one 10 pixel long strand all one color:
```json
 "accessories": [{
     "accessory": "OpcAccessory",
     "name": "Light Strip",
     "host": "localhost",
     "port": 7890,

     "lightbulbs": [
       { "name": "Strand",  "map": [ [0, 0, 10] ] }
     ]
 }]
```

* Strip 40 Pixel long strip with one pixel on each end as a lightbulb and the 38 pixels in between a gradient. Includes optional fade durations:
```json
 "accessories": [{
     "accessory": "OpcAccessory",
     "name": "Light Strip",
     "host": "localhost",
     "port": 7890,

     "fadeDuration": 100,
     "fadeOnDuration": 500,
     "fadeOffDuration": 1000,

     "lightbulbs": [
       { "name": "Left",  "map": [ [0,0] ] },
       { "name": "Right", "map": [ [0,39] ] },
     ],

     "gradients": [
       { "lightbulbNames": ["Left", "Right"], "map": [ [ 0, 1, 38, 1 ] ] }
     ]

 }]
```
