import "../chunk-G42LTC7K.mjs";
import { isListType, isNonNullType, isObjectType, isScalarType } from "graphql";
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
const isOrContainsScalar = (type) => isScalarType(type) || isNonNullType(type) && isOrContainsScalar(type.ofType) || isListType(type) && isOrContainsScalar(type.ofType);
const isOrContainsObjectType = (type) => isObjectType(type) || isNonNullType(type) && isOrContainsObjectType(type.ofType) || isListType(type) && isOrContainsObjectType(type.ofType);
const isOrContainsInputObjectType = (type) => isObjectType(type) || isNonNullType(type) && isOrContainsInputObjectType(type.ofType) || isListType(type) && isOrContainsInputObjectType(type.ofType);
const toActualType = (type) => {
  return isListType(type) ? toActualType(type.ofType) : isNonNullType(type) ? toActualType(type.ofType) : isObjectType(type) ? type : type;
};
const unwrapNonNull = (type) => isNonNullType(type) ? type.ofType : type;
export {
  capitalize,
  decapitalize,
  groupBySubject,
  isOrContainsInputObjectType,
  isOrContainsObjectType,
  isOrContainsScalar,
  parseNameFromUri,
  plural,
  printQuads,
  toActualType,
  unwrapNonNull
};
