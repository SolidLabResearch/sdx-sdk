"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { newObj[key] = obj[key]; } } } newObj.default = obj; return newObj; } } function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }require('../../chunk-S65R2BUY.js');
var _graphql = require('graphql');
var _ldpclient = require('../../commons/ldp/ldp-client');
var _constants = require('../../constants');
var _legacysdxclientjs = require('../../legacy-sdx-client.js'); var legacy = _interopRequireWildcard(_legacysdxclientjs);
var _shaclreaderservice = require('../../shacl-reader.service');
var _targetresolvers = require('./target-resolvers');
class SolidLDPContext {
  constructor(staticUrlOrResolver) {
    if (typeof staticUrlOrResolver === "string") {
      this.resolver = new (0, _targetresolvers.StaticTargetResolver)(staticUrlOrResolver);
    } else {
      this.resolver = staticUrlOrResolver;
    }
  }
}
class SolidLDPBackend {
  constructor(options) {
    this.requester = async (doc, vars, context) => {
      context = _nullishCoalesce(context, () => ( this.defaultContext));
      const parser = new (0, _shaclreaderservice.ShaclReaderService)();
      const query = _graphql.print.call(void 0, doc);
      if (!parser.primed) {
        await parser.primeCache(_constants.URI_SDX_GENERATE_SHACL_FOLDER);
      }
      const schema = await parser.parseSHACLs(_constants.URI_SDX_GENERATE_SHACL_FOLDER);
      const result = await _graphql.graphql.call(void 0, {
        source: query,
        variableValues: vars,
        schema,
        contextValue: context,
        fieldResolver: legacy.fieldResolver(this.ldpClient)
      });
      return result;
    };
    this.schemaFile = _optionalChain([options, 'optionalAccess', _ => _.schemaFile]) || _constants.URI_SDX_GENERATE_GRAPHQL_SCHEMA;
    this.defaultContext = _optionalChain([options, 'optionalAccess', _2 => _2.defaultContext]);
    this.ldpClient = new (0, _ldpclient.LdpClient)(_optionalChain([options, 'optionalAccess', _3 => _3.clientCredentials]));
  }
}
;



exports.SolidLDPBackend = SolidLDPBackend; exports.SolidLDPContext = SolidLDPContext;
