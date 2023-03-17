"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { newObj[key] = obj[key]; } } } newObj.default = obj; return newObj; } }require('./chunk-S65R2BUY.js');
var _graphql = require('graphql');
var _legacysdxclientjs = require('./legacy-sdx-client.js'); var legacy = _interopRequireWildcard(_legacysdxclientjs);
var _shaclparserservicejs = require('./shacl-parser.service.js');
const parser = new (0, _shaclparserservicejs.ShaclParserService)();
async function dynamicSdkClient(file) {
  const generated = await Promise.resolve().then(() => require(file));
  const getSdk = generated["getSdk"];
  return getSdk(legacyRequester("http://localhost:3000/complex.ttl"));
}
function legacyRequester(podLocation) {
  return async (doc, vars, options) => {
    const query = _graphql.print.call(void 0, doc);
    const schema = await parser.parseSHACL(".sdx/shacl");
    const result = await _graphql.graphql.call(void 0, {
      source: query,
      variableValues: vars,
      schema,
      fieldResolver: legacy.fieldResolver(podLocation)
    });
    return result;
  };
}



exports.dynamicSdkClient = dynamicSdkClient; exports.legacyRequester = legacyRequester;
