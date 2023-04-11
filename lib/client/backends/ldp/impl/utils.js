"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; } function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }require('../../../../chunk-S65R2BUY.js');
var _n3 = require('n3');
var _commons = require('../../../../commons');
var _axios = require('axios'); var _axios2 = _interopRequireDefault(_axios);
var _graphql = require('graphql');
const { namedNode, literal, defaultGraph, quad } = _n3.DataFactory;
async function getSubGraphArray(source, className, args) {
  const store = new (0, _n3.Store)(source);
  const quadsOfQuads = store.getSubjects(_commons.vocab.RDFS.a, namedNode(className), null).map(async (sub) => await getSubGraph(source, className, { id: sub.value }));
  return Promise.all(quadsOfQuads);
}
async function getSubGraph(source, className, args) {
  const store = new (0, _n3.Store)(source);
  const id = _optionalChain([args, 'optionalAccess', _ => _.id]);
  let topQuads = store.getSubjects(_commons.vocab.RDFS.a, namedNode(className), null).flatMap((sub) => store.getQuads(sub, null, null, null));
  if (id) {
    topQuads = topQuads.filter((quad2) => quad2.subject.value === id);
  }
  const follow = (quads, store2) => {
    return quads.reduce(
      (acc, quad2) => quad2.object.termType === "BlankNode" || quad2.object.termType === "NamedNode" ? [...acc, quad2, ...follow(store2.getQuads(quad2.object, null, null, null), store2)] : [...acc, quad2],
      []
    );
  };
  return follow(topQuads, store);
}
async function getGraph(location) {
  const doc = await _axios2.default.get(location);
  return new (0, _n3.Parser)().parse(doc.data);
}
function getDirectives(type) {
  if (_graphql.isListType.call(void 0, type)) {
    return getDirectives(type.ofType);
  }
  if (_graphql.isNonNullType.call(void 0, type)) {
    return getDirectives(type.ofType);
  }
  return _graphql.isScalarType.call(void 0, type) ? {} : _nullishCoalesce(type.extensions.directives, () => ( {}));
}
var ResourceType = /* @__PURE__ */ ((ResourceType2) => {
  ResourceType2[ResourceType2["CONTAINER"] = 0] = "CONTAINER";
  ResourceType2[ResourceType2["DOCUMENT"] = 1] = "DOCUMENT";
  return ResourceType2;
})(ResourceType || {});






exports.ResourceType = ResourceType; exports.getDirectives = getDirectives; exports.getGraph = getGraph; exports.getSubGraph = getSubGraph; exports.getSubGraphArray = getSubGraphArray;
