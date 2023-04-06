"use strict";Object.defineProperty(exports, "__esModule", {value: true});require('../../../../chunk-S65R2BUY.js');
var _graphql = require('graphql');
var _n3 = require('n3');
var _commons = require('../../../../commons');
var _targetresolvers = require('../target-resolvers');
var _utils = require('./utils');
const { namedNode } = _n3.DataFactory;
class QueryHandler {
  constructor(ldpClient) {
    this.ldpClient = ldpClient;
  }
  async handleQuery(source, args, context, info, rootTypes) {
    const { returnType, schema, fieldName, parentType, fieldNodes, path, rootValue, operation } = info;
    if (rootTypes.includes(parentType.name)) {
      const className = _utils.getDirectives.call(void 0, returnType).is["class"];
      const targetUrl = await context.resolver.resolve(className, new (0, _targetresolvers.TargetResolverContext)(this.ldpClient));
      source.quads = await _utils.getGraph.call(void 0, targetUrl.toString()).then((quads) => _utils.getSubGraph.call(void 0, quads, className, args));
    }
    if (_graphql.isListType.call(void 0, returnType) || _graphql.isNonNullType.call(void 0, returnType) && _graphql.isListType.call(void 0, returnType.ofType)) {
      if (_graphql.isScalarType.call(void 0, returnType.ofType) || _graphql.isNonNullType.call(void 0, returnType.ofType) && _graphql.isScalarType.call(void 0, returnType.ofType.ofType)) {
        const store = new (0, _n3.Store)(source.quads || []);
        const id = this.getIdentifier(store, parentType);
        const field = parentType.getFields()[fieldName];
        const directives = _utils.getDirectives.call(void 0, field);
        if (directives.property) {
          const { iri } = directives.property;
          return this.getProperties(store, id, iri);
        } else {
          console.log(">>>>>>> SHOULD NOT HAPPEN <<<<<<<<");
          return _graphql.defaultFieldResolver.call(void 0, source, args, context, info);
        }
      } else {
        const className = _utils.getDirectives.call(void 0, returnType).is["class"];
        return (await _utils.getSubGraphArray.call(void 0, source.quads, className, {})).map((quads) => ({ ...source, quads }));
      }
    } else {
      if (_graphql.isScalarType.call(void 0, returnType) || _graphql.isNonNullType.call(void 0, returnType) && _graphql.isScalarType.call(void 0, returnType.ofType)) {
        const actualReturnType = _graphql.isNonNullType.call(void 0, returnType) ? returnType.ofType : returnType;
        const store = new (0, _n3.Store)(source.quads || []);
        const id = this.getIdentifier(store, parentType);
        const field = parentType.getFields()[fieldName];
        const directives = _utils.getDirectives.call(void 0, field);
        if (directives.identifier || actualReturnType.toString() === "ID") {
          return id;
        } else if (directives.property) {
          const { iri } = directives.property;
          return this.getProperty(store, id, iri);
        } else {
          console.log(">>>>>>> SHOULD NOT HAPPEN <<<<<<<<");
          return _graphql.defaultFieldResolver.call(void 0, source, args, context, info);
        }
      } else {
        const className = _utils.getDirectives.call(void 0, returnType).is["class"];
        source.quads = await _utils.getSubGraph.call(void 0, source.quads, className, {});
        source.parentClassIri = className;
        return source;
      }
    }
  }
  getIdentifier(store, type) {
    const className = _utils.getDirectives.call(void 0, type).is["class"];
    return store.getSubjects(_commons.vocab.RDFS.a, namedNode(className), null).at(0).value;
  }
  getProperty(store, subject, predicate) {
    return store.getObjects(namedNode(subject), namedNode(predicate), null).at(0).value;
  }
  getProperties(store, subject, predicate) {
    return store.getObjects(namedNode(subject), namedNode(predicate), null).map((obj) => obj.value);
  }
}


exports.QueryHandler = QueryHandler;
