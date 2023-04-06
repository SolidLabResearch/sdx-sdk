"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { newObj[key] = obj[key]; } } } newObj.default = obj; return newObj; } } function _createStarExport(obj) { Object.keys(obj) .filter((key) => key !== "default" && key !== "__esModule") .forEach((key) => { if (exports.hasOwnProperty(key)) { return; } Object.defineProperty(exports, key, {enumerable: true, configurable: true, get: () => obj[key]}); }); }require('../chunk-S65R2BUY.js');
var _utiljs = require('./util.js'); var utils = _interopRequireWildcard(_utiljs);
var _vocabjs = require('./vocab.js'); var vocab = _interopRequireWildcard(_vocabjs);
var _solidclientcredentialsjs = require('./auth/solid-client-credentials.js'); _createStarExport(_solidclientcredentialsjs);
var _ldpclientjs = require('./ldp/ldp-client.js'); _createStarExport(_ldpclientjs);



exports.utils = utils; exports.vocab = vocab;
