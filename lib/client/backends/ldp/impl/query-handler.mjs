import "../../../../chunk-G42LTC7K.mjs";
import { defaultFieldResolver, isListType, isNonNullType, isScalarType } from "graphql";
import { DataFactory, Store } from "n3";
import { vocab } from "../../../../commons";
import { TargetResolverContext } from "../target-resolvers";
import { getDirectives, getGraph, getSubGraph, getSubGraphArray } from "./utils";
const { namedNode } = DataFactory;
class QueryHandler {
  constructor(ldpClient) {
    this.ldpClient = ldpClient;
  }
  async handleQuery(source, args, context, info, rootTypes) {
    const { returnType, schema, fieldName, parentType, fieldNodes, path, rootValue, operation } = info;
    if (rootTypes.includes(parentType.name)) {
      const className = getDirectives(returnType).is["class"];
      const targetUrl = await context.resolver.resolve(className, new TargetResolverContext(this.ldpClient));
      source.quads = await getGraph(targetUrl.toString()).then((quads) => getSubGraph(quads, className, args));
    }
    if (isListType(returnType)) {
      if (isScalarType(returnType.ofType) || isNonNullType(returnType.ofType) && isScalarType(returnType.ofType.ofType)) {
        const store = new Store(source.quads || []);
        const id = this.getIdentifier(store, parentType);
        const field = parentType.getFields()[fieldName];
        const directives = getDirectives(field);
        if (directives.property) {
          const { iri } = directives.property;
          return this.getProperties(store, id, iri);
        } else {
          console.log(">>>>>>> SHOULD NOT HAPPEN <<<<<<<<");
          return defaultFieldResolver(source, args, context, info);
        }
      } else {
        const className = getDirectives(returnType).is["class"];
        return (await getSubGraphArray(source.quads, className, {})).map((quads) => ({ ...source, quads }));
      }
    } else {
      if (isScalarType(returnType) || isNonNullType(returnType) && isScalarType(returnType.ofType)) {
        const store = new Store(source.quads || []);
        const id = this.getIdentifier(store, parentType);
        const field = parentType.getFields()[fieldName];
        const directives = getDirectives(field);
        if (directives.identifier || returnType.toString() === "ID") {
          return id;
        } else if (directives.property) {
          const { iri } = directives.property;
          return this.getProperty(store, id, iri);
        } else {
          console.log(">>>>>>> SHOULD NOT HAPPEN <<<<<<<<");
          return defaultFieldResolver(source, args, context, info);
        }
      } else {
        const className = getDirectives(returnType).is["class"];
        source.quads = await getSubGraph(source.quads, className, {});
        source.parentClassIri = className;
        return source;
      }
    }
  }
  getIdentifier(store, type) {
    const className = getDirectives(type).is["class"];
    return store.getSubjects(vocab.RDFS.a, namedNode(className), null).at(0).value;
  }
  getProperty(store, subject, predicate) {
    return store.getObjects(namedNode(subject), namedNode(predicate), null).at(0).value;
  }
  getProperties(store, subject, predicate) {
    return store.getObjects(namedNode(subject), namedNode(predicate), null).map((obj) => obj.value);
  }
}
export {
  QueryHandler
};
