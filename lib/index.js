"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _createStarExport(obj) { Object.keys(obj) .filter((key) => key !== "default" && key !== "__esModule") .forEach((key) => { if (exports.hasOwnProperty(key)) { return; } Object.defineProperty(exports, key, {enumerable: true, configurable: true, get: () => obj[key]}); }); }require('reflect-metadata');
var _solidldpbackend = require('./backends/ldp/solid-ldp-backend'); _createStarExport(_solidldpbackend);
var _targetresolvers = require('./backends/ldp/target-resolvers'); _createStarExport(_targetresolvers);
