"use strict";Object.defineProperty(exports, "__esModule", {value: true});require('./chunk-S65R2BUY.js');
var _graphql = require('graphql');
function parseNameFromUri(uriString) {
  const uri = new URL(uriString);
  return uri.hash.length > 0 ? uri.hash.slice(1) : uri.pathname.slice(uri.pathname.lastIndexOf("/") + 1);
}
function groupBySubject(quads) {
  return quads.reduce((index, quad) => {
    if (index.has(quad.subject)) {
      index.get(quad.subject).push(quad);
    } else {
      index.set(quad.subject, [quad]);
    }
    return index;
  }, /* @__PURE__ */ new Map());
}
function printQuads(quads, label) {
  if (label) {
    console.log(`${label} ==> `);
  }
  let q = quads instanceof Array ? quads : quads.getQuads(null, null, null, null);
  q.forEach((q2) => console.log(`[${q2.subject.value} ${q2.predicate.value} ${q2.object.value}]`));
}
const capitalize = (str) => str.slice(0, 1).toUpperCase() + str.slice(1);
const decapitalize = (str) => str.slice(0, 1).toLowerCase() + str.slice(1);
const plural = (str) => `${str}Collection`;
const isOrContainsScalar = (type) => _graphql.isScalarType.call(void 0, type) || _graphql.isNonNullType.call(void 0, type) && isOrContainsScalar(type.ofType) || _graphql.isListType.call(void 0, type) && isOrContainsScalar(type.ofType);
const isOrContainsObjectType = (type) => _graphql.isObjectType.call(void 0, type) || _graphql.isNonNullType.call(void 0, type) && isOrContainsObjectType(type.ofType) || _graphql.isListType.call(void 0, type) && isOrContainsObjectType(type.ofType);
const isOrContainsInputObjectType = (type) => _graphql.isObjectType.call(void 0, type) || _graphql.isNonNullType.call(void 0, type) && isOrContainsInputObjectType(type.ofType) || _graphql.isListType.call(void 0, type) && isOrContainsInputObjectType(type.ofType);
const toActualType = (type) => {
  return _graphql.isListType.call(void 0, type) ? toActualType(type.ofType) : _graphql.isNonNullType.call(void 0, type) ? toActualType(type.ofType) : _graphql.isObjectType.call(void 0, type) ? type : type;
};











exports.capitalize = capitalize; exports.decapitalize = decapitalize; exports.groupBySubject = groupBySubject; exports.isOrContainsInputObjectType = isOrContainsInputObjectType; exports.isOrContainsObjectType = isOrContainsObjectType; exports.isOrContainsScalar = isOrContainsScalar; exports.parseNameFromUri = parseNameFromUri; exports.plural = plural; exports.printQuads = printQuads; exports.toActualType = toActualType;
