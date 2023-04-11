"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { newObj[key] = obj[key]; } } } newObj.default = obj; return newObj; } } function _createStarExport(obj) { Object.keys(obj) .filter((key) => key !== "default" && key !== "__esModule") .forEach((key) => { if (exports.hasOwnProperty(key)) { return; } Object.defineProperty(exports, key, {enumerable: true, configurable: true, get: () => obj[key]}); }); }require('../chunk-S65R2BUY.js');
var _util = require('./util'); var utils = _interopRequireWildcard(_util);
var _vocab = require('./vocab'); var vocab = _interopRequireWildcard(_vocab);
var _solidclientcredentials = require('./auth/solid-client-credentials'); _createStarExport(_solidclientcredentials);
var _ldpclient = require('./ldp/ldp-client'); _createStarExport(_ldpclient);



exports.utils = utils; exports.vocab = vocab;