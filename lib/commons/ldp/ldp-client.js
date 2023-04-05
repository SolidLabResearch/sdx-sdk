"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }require('../../chunk-S65R2BUY.js');
var _axios = require('axios'); var _axios2 = _interopRequireDefault(_axios);
var _n3 = require('n3');
class LdpClient {
  constructor(clientCredentials) {
    this.clientCredentials = clientCredentials;
  }
  async patchDocument(url, inserts = null, deletes = null) {
    const insertsWriter = new (0, _n3.Writer)({ format: "N-Triples", prefixes: { solid: "http://www.w3.org/ns/solid/terms#" } });
    const deletesWriter = new (0, _n3.Writer)({ format: "N-Triples", prefixes: { solid: "http://www.w3.org/ns/solid/terms#" } });
    let n3Inserts = null;
    let n3Deletes = null;
    if (inserts) {
      insertsWriter.addQuads(inserts);
      insertsWriter.end((_, result) => n3Inserts = `solid:inserts { ${result} }`);
    }
    if (deletes) {
      deletesWriter.addQuads(deletes);
      deletesWriter.end((_, result) => n3Deletes = `solid:deletes { ${result} }`);
    }
    const patchContent = [n3Inserts, n3Deletes].filter((item) => item != null).join(";") + ".";
    const requestBody = `@prefix solid: <http://www.w3.org/ns/solid/terms#>.
_:rename a solid:InsertDeletePatch;
${patchContent}`;
    const resp = await _axios2.default.call(void 0, {
      method: "patch",
      url,
      data: requestBody,
      headers: {
        "Content-Type": "text/n3"
      }
    });
    if (resp.status < 200 || resp.status > 399) {
      throw new Error(`The patch was not completed successfully (status: ${resp.status}, message: ${resp.data})`);
    }
    return resp;
  }
}


exports.LdpClient = LdpClient;
