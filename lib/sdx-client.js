"use strict";Object.defineProperty(exports, "__esModule", {value: true});require('./chunk-S65R2BUY.js');
var _legacysdxclientjs = require('./legacy-sdx-client.js');
class SdxClient {
  constructor() {
    this.legacyClient = new (0, _legacysdxclientjs.LegacySdxClient)("http://localhost:3000/complex.ttl");
  }
  async query(query, documentLocation) {
    return this.legacyClient.query(query, documentLocation);
  }
  async mutation(mutation) {
    throw new Error("Method not implemented.");
  }
}


exports.SdxClient = SdxClient;
