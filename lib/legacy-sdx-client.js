"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; } function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }require('./chunk-S65R2BUY.js');
var _axios = require('axios'); var _axios2 = _interopRequireDefault(_axios);
var _graphql = require('graphql');
var _n3 = require('n3');
var _shaclparserservicejs = require('./shacl-parser.service.js');
var _vocabjs = require('./vocab.js');
const { namedNode } = _n3.DataFactory;
class LegacySdxClient {
  constructor(podLocation) {
    this.podLocation = podLocation;
    this.parser = new (0, _shaclparserservicejs.ShaclParserService)();
    this.request = async (doc, vars, options) => {
      const query = _graphql.print.call(void 0, doc);
      const schema = await this.getSchema();
      console.log(query);
      console.log(vars);
      console.log(this.podLocation);
      const result = await _graphql.graphql.call(void 0, {
        source: query,
        variableValues: vars,
        schema,
        fieldResolver: this.fieldResolver(this.podLocation)
      });
      console.log(result.errors);
      return result.data;
    };
    this.fieldResolver = (location) => async (source, args, context, info) => {
      const { returnType, schema, fieldName, parentType, fieldNodes, path, rootValue } = info;
      const rootTypes = [
        _optionalChain([schema, 'access', _ => _.getQueryType, 'call', _2 => _2(), 'optionalAccess', _3 => _3.name]),
        _optionalChain([schema, 'access', _4 => _4.getMutationType, 'call', _5 => _5(), 'optionalAccess', _6 => _6.name]),
        _optionalChain([schema, 'access', _7 => _7.getSubscriptionType, 'call', _8 => _8(), 'optionalAccess', _9 => _9.name])
      ].filter((t) => !!t);
      if (rootTypes.includes(parentType.name)) {
        const className = getDirectives(returnType).is["class"];
        source = await getGraph(location).then((quads) => getSubGraph(quads, className, args));
      }
      if (_graphql.isListType.call(void 0, returnType)) {
        if (_graphql.isScalarType.call(void 0, returnType.ofType) || _graphql.isNonNullType.call(void 0, returnType.ofType) && _graphql.isScalarType.call(void 0, returnType.ofType.ofType)) {
          const store = new (0, _n3.Store)(source || []);
          const id = getIdentifier(store, parentType);
          const field = parentType.getFields()[fieldName];
          const directives = getDirectives(field);
          if (directives.property) {
            const { iri } = directives.property;
            return getProperties(store, id, iri);
          } else {
            console.log(">>>>>>> SHOULD NOT HAPPEN <<<<<<<<");
            return _graphql.defaultFieldResolver.call(void 0, source, args, context, info);
          }
        } else {
          const className = getDirectives(returnType).is["class"];
          return getSubGraphArray(source, className, {});
        }
      } else {
        if (_graphql.isScalarType.call(void 0, returnType) || _graphql.isNonNullType.call(void 0, returnType) && _graphql.isScalarType.call(void 0, returnType.ofType)) {
          const store = new (0, _n3.Store)(source || []);
          const id = getIdentifier(store, parentType);
          const field = parentType.getFields()[fieldName];
          const directives = getDirectives(field);
          if (directives.identifier) {
            return id;
          } else if (directives.property) {
            const { iri } = directives.property;
            return getProperty(store, id, iri);
          } else {
            console.log(">>>>>>> SHOULD NOT HAPPEN <<<<<<<<");
            return _graphql.defaultFieldResolver.call(void 0, source, args, context, info);
          }
        } else {
          const className = getDirectives(returnType).is["class"];
          return getSubGraph(source, className, {});
        }
      }
    };
  }
  async getSchema() {
    return await this.parser.parseSHACL(".sdx/shacl");
  }
  async query(query, location) {
    const schema = await this.getSchema();
    const result = await _graphql.graphql.call(void 0, {
      source: query,
      schema,
      fieldResolver: this.fieldResolver(_nullishCoalesce(location, () => ( this.podLocation)))
    });
    return result.data;
  }
}
async function getSubGraphArray(source, className, args) {
  const store = new (0, _n3.Store)(source);
  const quadsOfQuads = store.getSubjects(_vocabjs.RDFS.a, namedNode(className), null).map(async (sub) => await getSubGraph(source, className, { id: sub.value }));
  return Promise.all(quadsOfQuads);
}
async function getSubGraph(source, className, args) {
  const store = new (0, _n3.Store)(source);
  const id = _optionalChain([args, 'optionalAccess', _10 => _10.id]);
  console.log(args);
  let topQuads = store.getSubjects(_vocabjs.RDFS.a, namedNode(className), null).flatMap((sub) => store.getQuads(sub, null, null, null));
  if (id) {
    topQuads = topQuads.filter((quad) => quad.subject.value === id);
  }
  const follow = (quads, store2) => {
    return quads.reduce(
      (acc, quad) => quad.object.termType === "BlankNode" || quad.object.termType === "NamedNode" ? [...acc, quad, ...follow(store2.getQuads(quad.object, null, null, null), store2)] : [...acc, quad],
      []
    );
  };
  return follow(topQuads, store);
}
async function getGraph(location) {
  const doc = await _axios2.default.get(location);
  console.log(doc.data);
  return new (0, _n3.Parser)().parse(doc.data);
}
function getIdentifier(store, type) {
  const className = getDirectives(type).is["class"];
  return store.getSubjects(_vocabjs.RDFS.a, namedNode(className), null).at(0).value;
}
function getProperty(store, subject, predicate) {
  return store.getObjects(namedNode(subject), namedNode(predicate), null).at(0).value;
}
function getProperties(store, subject, predicate) {
  return store.getObjects(namedNode(subject), namedNode(predicate), null).map((obj) => obj.value);
}
function getDirectives(type) {
  if (_graphql.isListType.call(void 0, type)) {
    return getDirectives(type.ofType);
  }
  return _graphql.isScalarType.call(void 0, type) ? {} : _nullishCoalesce(type.extensions.directives, () => ( {}));
}


exports.LegacySdxClient = LegacySdxClient;
