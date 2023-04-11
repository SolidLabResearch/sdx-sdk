import "../../../../chunk-G42LTC7K.mjs";
import { Store, DataFactory, Parser } from "n3";
import { vocab } from "../../../../commons";
import axios from "axios";
import { isListType, isNonNullType, isScalarType } from "graphql";
const { namedNode, literal, defaultGraph, quad } = DataFactory;
async function getSubGraphArray(source, className, args) {
  const store = new Store(source);
  const quadsOfQuads = store.getSubjects(vocab.RDFS.a, namedNode(className), null).map(async (sub) => await getSubGraph(source, className, { id: sub.value }));
  return Promise.all(quadsOfQuads);
}
async function getSubGraph(source, className, args) {
  const store = new Store(source);
  const id = args?.id;
  let topQuads = store.getSubjects(vocab.RDFS.a, namedNode(className), null).flatMap((sub) => store.getQuads(sub, null, null, null));
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
  const doc = await axios.get(location);
  return new Parser().parse(doc.data);
}
function getDirectives(type) {
  if (isListType(type)) {
    return getDirectives(type.ofType);
  }
  if (isNonNullType(type)) {
    return getDirectives(type.ofType);
  }
  return isScalarType(type) ? {} : type.extensions.directives ?? {};
}
var ResourceType = /* @__PURE__ */ ((ResourceType2) => {
  ResourceType2[ResourceType2["CONTAINER"] = 0] = "CONTAINER";
  ResourceType2[ResourceType2["DOCUMENT"] = 1] = "DOCUMENT";
  return ResourceType2;
})(ResourceType || {});
export {
  ResourceType,
  getDirectives,
  getGraph,
  getSubGraph,
  getSubGraphArray
};
