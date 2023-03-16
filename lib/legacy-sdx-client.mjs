import "./chunk-G42LTC7K.mjs";
import axios from "axios";
import { defaultFieldResolver, graphql, isListType, isNonNullType, isScalarType, print } from "graphql";
import { DataFactory, Parser, Store } from "n3";
import { ShaclParserService } from "./shacl-parser.service.js";
import { RDFS } from "./vocab.js";
const { namedNode } = DataFactory;
class LegacySdxClient {
  constructor(podLocation) {
    this.podLocation = podLocation;
    this.parser = new ShaclParserService();
    this.request = async (doc, vars, options) => {
      const query = print(doc);
      const schema = await this.getSchema();
      console.log(query);
      console.log(vars);
      console.log(this.podLocation);
      const result = await graphql({
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
        schema.getQueryType()?.name,
        schema.getMutationType()?.name,
        schema.getSubscriptionType()?.name
      ].filter((t) => !!t);
      if (rootTypes.includes(parentType.name)) {
        const className = getDirectives(returnType).is["class"];
        source = await getGraph(location).then((quads) => getSubGraph(quads, className, args));
      }
      if (isListType(returnType)) {
        if (isScalarType(returnType.ofType) || isNonNullType(returnType.ofType) && isScalarType(returnType.ofType.ofType)) {
          const store = new Store(source || []);
          const id = getIdentifier(store, parentType);
          const field = parentType.getFields()[fieldName];
          const directives = getDirectives(field);
          if (directives.property) {
            const { iri } = directives.property;
            return getProperties(store, id, iri);
          } else {
            console.log(">>>>>>> SHOULD NOT HAPPEN <<<<<<<<");
            return defaultFieldResolver(source, args, context, info);
          }
        } else {
          const className = getDirectives(returnType).is["class"];
          return getSubGraphArray(source, className, {});
        }
      } else {
        if (isScalarType(returnType) || isNonNullType(returnType) && isScalarType(returnType.ofType)) {
          const store = new Store(source || []);
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
            return defaultFieldResolver(source, args, context, info);
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
    const result = await graphql({
      source: query,
      schema,
      fieldResolver: this.fieldResolver(location ?? this.podLocation)
    });
    return result.data;
  }
}
async function getSubGraphArray(source, className, args) {
  const store = new Store(source);
  const quadsOfQuads = store.getSubjects(RDFS.a, namedNode(className), null).map(async (sub) => await getSubGraph(source, className, { id: sub.value }));
  return Promise.all(quadsOfQuads);
}
async function getSubGraph(source, className, args) {
  const store = new Store(source);
  const id = args?.id;
  console.log(args);
  let topQuads = store.getSubjects(RDFS.a, namedNode(className), null).flatMap((sub) => store.getQuads(sub, null, null, null));
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
  const doc = await axios.get(location);
  console.log(doc.data);
  return new Parser().parse(doc.data);
}
function getIdentifier(store, type) {
  const className = getDirectives(type).is["class"];
  return store.getSubjects(RDFS.a, namedNode(className), null).at(0).value;
}
function getProperty(store, subject, predicate) {
  return store.getObjects(namedNode(subject), namedNode(predicate), null).at(0).value;
}
function getProperties(store, subject, predicate) {
  return store.getObjects(namedNode(subject), namedNode(predicate), null).map((obj) => obj.value);
}
function getDirectives(type) {
  if (isListType(type)) {
    return getDirectives(type.ofType);
  }
  return isScalarType(type) ? {} : type.extensions.directives ?? {};
}
export {
  LegacySdxClient
};
