"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }require('../../../chunk-S65R2BUY.js');
var _graphql = require('graphql');
var _commons = require('../../../commons');
var _constants = require('../../../constants');
var _parse = require('../../../parse');
var _mutationhandler = require('./impl/mutation-handler');
var _queryhandler = require('./impl/query-handler');
var _utils = require('./impl/utils');
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
    this.rootTypes = [];
    this.requester = async (doc, vars, context) => {
      context = _nullishCoalesce(context, () => ( this.defaultContext));
      const parser = new (0, _parse.ShaclReaderService)();
      const query = _graphql.print.call(void 0, doc);
      if (!parser.primed) {
        await parser.primeCache(_constants.URI_SDX_GENERATE_SHACL_FOLDER);
      }
      const schema = await parser.parseSHACLs(_constants.URI_SDX_GENERATE_SHACL_FOLDER);
      this.rootTypes = [
        _optionalChain([schema, 'access', _ => _.getQueryType, 'call', _2 => _2(), 'optionalAccess', _3 => _3.name]),
        _optionalChain([schema, 'access', _4 => _4.getMutationType, 'call', _5 => _5(), 'optionalAccess', _6 => _6.name]),
        _optionalChain([schema, 'access', _7 => _7.getSubscriptionType, 'call', _8 => _8(), 'optionalAccess', _9 => _9.name])
      ].filter((t) => !!t);
      const result = await _graphql.graphql.call(void 0, {
        source: query,
        variableValues: vars,
        schema,
        contextValue: context,
        fieldResolver: this.fieldResolver
      });
      return result;
    };
    this.fieldResolver = async (source, args, context, info) => {
      const { schema, operation } = info;
      source = _nullishCoalesce(source, () => ( {
        quads: [],
        resourceType: _utils.ResourceType.DOCUMENT
      }));
      if ("mutation" === operation.operation && !source.queryOverride) {
        return this.mutationHandler.handleMutation(source, args, context, info, this.rootTypes);
      }
      if ("query" === operation.operation || source.queryOverride) {
        return this.queryHandler.handleQuery(source, args, context, info, this.rootTypes);
      }
    };
    this.schemaFile = _optionalChain([options, 'optionalAccess', _10 => _10.schemaFile]) || _constants.URI_SDX_GENERATE_GRAPHQL_SCHEMA;
    this.defaultContext = _optionalChain([options, 'optionalAccess', _11 => _11.defaultContext]);
    const ldpClient = new (0, _commons.LdpClient)(_optionalChain([options, 'optionalAccess', _12 => _12.clientCredentials]));
    this.queryHandler = new (0, _queryhandler.QueryHandler)(ldpClient);
    this.mutationHandler = new (0, _mutationhandler.MutationHandler)(ldpClient);
  }
}



exports.SolidLDPBackend = SolidLDPBackend; exports.SolidLDPContext = SolidLDPContext;
