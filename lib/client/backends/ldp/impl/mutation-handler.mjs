import "../../../../chunk-G42LTC7K.mjs";
import { isListType, isNonNullType, isScalarType } from "graphql";
import { DataFactory, Store } from "n3";
import { v4 as uuidv4 } from "uuid";
import { LdpClient, utils, vocab } from "../../../../commons";
import { TargetResolverContext } from "../target-resolvers";
import { ResourceType, getDirectives, getGraph, getSubGraph } from "./utils";
const { literal, namedNode, quad } = DataFactory;
const ID_FIELD = "id";
const SLUG_FIELD = "slug";
class MutationHandler {
  constructor(ldpClient) {
    this.ldpClient = ldpClient;
  }
  async handleMutation(source, args, context, info, rootTypes) {
    const { returnType, fieldName, parentType } = info;
    if (rootTypes.includes(parentType.name)) {
      const className = this.getDirectives(returnType).is["class"];
      const targetUrl = await context.resolver.resolve(className, new TargetResolverContext(this.ldpClient));
      const graph = await getGraph(targetUrl.toString());
      source.quads = await getSubGraph(graph, className, args);
    }
    if (fieldName === "delete")
      return this.handleDeleteMutation(source, args, context, info);
    if (fieldName === "update")
      return this.handleUpdateMutation(source, args, context, info);
    if (fieldName.startsWith("create"))
      return this.handleCreateMutation(source, args, context, info, rootTypes);
    if (fieldName.startsWith("mutate"))
      return this.handleGetMutateObjectType(source, args, context, info, rootTypes);
    if (fieldName.startsWith("set"))
      return this.TODO();
    if (fieldName.startsWith("clear"))
      return this.TODO();
    if (fieldName.startsWith("add"))
      return this.TODO();
    if (fieldName.startsWith("remove"))
      return this.TODO();
    if (fieldName.startsWith("link"))
      return this.TODO();
    if (fieldName.startsWith("unlink"))
      return this.TODO();
    return this.executeWithQueryHandler(source);
  }
  async handleCreateMutation(source, args, context, info, rootTypes) {
    const className = this.getDirectives(info.returnType).is["class"];
    const targetUrl = await context.resolver.resolve(className, new TargetResolverContext(this.ldpClient));
    const input = args.input;
    source.subject = namedNode(this.getNewInstanceID(input, source.resourceType));
    const inputType = info.parentType.getFields()[info.fieldName].args.find((arg) => arg.name === "input").type;
    source.quads = this.generateTriplesForInput(source.subject, input, utils.unwrapNonNull(inputType), namedNode(className));
    switch (source.resourceType) {
      case ResourceType.DOCUMENT:
        await new LdpClient().patchDocument(targetUrl.toString(), source.quads);
    }
    return this.executeWithQueryHandler(source);
  }
  async handleGetMutateObjectType(source, args, context, info, rootTypes) {
    const className = getDirectives(info.returnType).is["class"];
    const targetUrl = await context.resolver.resolve(className, new TargetResolverContext(this.ldpClient));
    if (targetUrl.toString()) {
      source.subject = namedNode(args.id);
      source.quads = await getSubGraph(source.quads, className, args);
      source.parentClassIri = className;
      return source;
    } else {
      throw new Error("A target URL for this request could not be resolved!");
    }
  }
  async handleDeleteMutation(source, args, context, info) {
    console.log("DELETE MUTATION");
    const targetUrl = await context.resolver.resolve(source.parentClassIri, new TargetResolverContext(this.ldpClient));
    switch (source.resourceType) {
      case ResourceType.DOCUMENT:
        await new LdpClient().patchDocument(targetUrl.toString(), null, source.quads);
    }
    return this.executeWithQueryHandler(source);
  }
  async handleUpdateMutation(source, args, context, info) {
    const returnType = info.schema.getType(utils.unwrapNonNull(info.returnType).toString());
    const targetUrl = await context.resolver.resolve(source.parentClassIri, new TargetResolverContext(this.ldpClient));
    const input = args.input;
    const { inserts, deletes } = this.generateTriplesForUpdate(source.quads, input, source.subject, returnType);
    switch (source.resourceType) {
      case ResourceType.DOCUMENT:
        await new LdpClient().patchDocument(targetUrl.toString(), inserts, deletes);
    }
    const store = new Store(source.quads);
    store.removeQuads(deletes);
    store.addQuads(inserts);
    source.quads = store.getQuads(null, null, null, null);
    return this.executeWithQueryHandler(source);
  }
  getDirectives(type) {
    if (isListType(type)) {
      return getDirectives(type.ofType);
    }
    if (isNonNullType(type)) {
      return getDirectives(type.ofType);
    }
    return isScalarType(type) ? {} : type.extensions.directives ?? {};
  }
  getNewInstanceID(input, resourceType) {
    switch (resourceType) {
      case ResourceType.CONTAINER:
        return "";
      case ResourceType.DOCUMENT:
        return input[ID_FIELD]?.toString() ?? `#${input[SLUG_FIELD]}` ?? uuidv4();
      default:
        return "";
    }
  }
  generateTriplesForInput(subject, input, inputDefinition, classUri) {
    const quads = [];
    quads.push(quad(subject, vocab.RDFS.a, classUri));
    return Object.values(inputDefinition.getFields()).filter((field) => field.name !== "slug" && field.name !== "id").reduce((acc, field) => {
      if (field.name in input) {
        acc.push(quad(subject, namedNode(getDirectives(field).property["iri"]), literal(input[field.name])));
      }
      return acc;
    }, quads);
  }
  generateTriplesForUpdate(source, input, subject, objectTypeDefinition) {
    const store = new Store(source);
    const inserts = [];
    const deletes = [];
    Object.entries(input).forEach(([fieldName, value]) => {
      const fieldDef = objectTypeDefinition.getFields()[fieldName];
      const propertyIri = getDirectives(fieldDef).property["iri"];
      if (value == null) {
        if (isNonNullType(fieldDef.type)) {
          throw new Error(`Update input provided null value for non-nullable field '${fieldName}'`);
        }
        deletes.push(...store.getQuads(subject, namedNode(propertyIri), null, null));
      } else {
        deletes.push(...store.getQuads(subject, namedNode(propertyIri), null, null));
        if (isListType(fieldDef.type)) {
          inserts.push(...value.map((v) => quad(subject, namedNode(propertyIri), literal(v))));
        } else {
          inserts.push(quad(subject, namedNode(propertyIri), literal(value)));
        }
      }
    });
    return { inserts, deletes };
  }
  TODO() {
    alert("TODO");
  }
  executeWithQueryHandler(source) {
    return { ...source, queryOverride: true };
  }
}
export {
  MutationHandler
};
