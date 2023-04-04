import "./chunk-G42LTC7K.mjs";
import axios from "axios";
import { defaultFieldResolver, isListType, isNonNullType, isScalarType } from "graphql";
import { DataFactory, Parser, Store } from "n3";
import { v4 as uuidv4 } from "uuid";
import { LdpClient } from "./ldp-client.js";
import { ResourceType } from "./types.js";
import { unwrapNonNull } from "./util.js";
import { RDFS } from "./vocab.js";
const { namedNode, quad, literal } = DataFactory;
const ID_FIELD = "id";
const SLUG_FIELD = "slug";
function fieldResolver(location) {
  return async (source, args, context, info) => {
    const { returnType, schema, fieldName, parentType, fieldNodes, path, rootValue, operation } = info;
    if (!source) {
      source = {
        quads: [],
        requestUrl: location,
        resourceType: ResourceType.DOCUMENT
      };
    }
    const rootTypes = [
      schema.getQueryType()?.name,
      schema.getMutationType()?.name,
      schema.getSubscriptionType()?.name
    ].filter((t) => !!t);
    if ("query" === operation.operation) {
      return handleQuery(source, args, context, info, rootTypes);
    }
    if ("mutation" === operation.operation) {
      return handleMutation(source, args, context, info, rootTypes);
    }
  };
  async function getSubGraphArray(source, className, args) {
    const store = new Store(source);
    const quadsOfQuads = store.getSubjects(RDFS.a, namedNode(className), null).map(async (sub) => await getSubGraph(source, className, { id: sub.value }));
    return Promise.all(quadsOfQuads);
  }
  async function getSubGraph(source, className, args) {
    const store = new Store(source);
    const id = args?.id;
    let topQuads = store.getSubjects(RDFS.a, namedNode(className), null).flatMap((sub) => store.getQuads(sub, null, null, null));
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
  async function getGraph(location2) {
    const doc = await axios.get(location2);
    return new Parser().parse(doc.data);
  }
  async function handleQuery(source, args, context, info, rootTypes) {
    const { returnType, schema, fieldName, parentType, fieldNodes, path, rootValue, operation } = info;
    if (rootTypes.includes(parentType.name)) {
      const className = getDirectives(returnType).is["class"];
      source.quads = await getGraph(location).then((quads) => getSubGraph(quads, className, args));
    }
    if (isListType(returnType)) {
      if (isScalarType(returnType.ofType) || isNonNullType(returnType.ofType) && isScalarType(returnType.ofType.ofType)) {
        const store = new Store(source.quads || []);
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
        return (await getSubGraphArray(source.quads, className, {})).map((quads) => ({ ...source, quads }));
      }
    } else {
      if (isScalarType(returnType) || isNonNullType(returnType) && isScalarType(returnType.ofType)) {
        const store = new Store(source.quads || []);
        const id = getIdentifier(store, parentType);
        const field = parentType.getFields()[fieldName];
        const directives = getDirectives(field);
        if (directives.identifier || returnType.toString() === "ID") {
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
        source.quads = await getSubGraph(source.quads, className, {});
        return source;
      }
    }
  }
  async function handleMutation(source, args, context, info, rootTypes) {
    const { returnType, schema, fieldName, parentType, fieldNodes, path, rootValue, operation } = info;
    if (rootTypes.includes(parentType.name)) {
      const className = getDirectives(returnType).is["class"];
      const graph = await getGraph(source.requestUrl);
      source.quads = await getSubGraph(graph, className, args);
    }
    if (fieldName === "delete")
      return handleDeleteMutation(source, args, context, info);
    if (fieldName === "update")
      return handleUpdateMutation(source, args, context, info);
    if (fieldName.startsWith("create"))
      return handleCreateMutation(source, args, context, info, rootTypes);
    if (fieldName.startsWith("mutate"))
      return handleGetMutateObjectType(source, args, context, info, rootTypes);
    if (fieldName.startsWith("set"))
      return TODO();
    if (fieldName.startsWith("clear"))
      return TODO();
    if (fieldName.startsWith("add"))
      return TODO();
    if (fieldName.startsWith("remove"))
      return TODO();
    if (fieldName.startsWith("link"))
      return TODO();
    if (fieldName.startsWith("unlink"))
      return TODO();
    return handleQuery(source, args, context, info, rootTypes);
  }
  async function handleCreateMutation(source, args, context, info, rootTypes) {
    console.log("create", source);
    const classUri = getDirectives(info.returnType).is["class"];
    const targetUrl = source.requestUrl;
    const input = args.input;
    source.subject = namedNode(getNewInstanceID(input, source.resourceType));
    const inputType = info.parentType.getFields()[info.fieldName].args.find((arg) => arg.name === "input").type;
    source.quads = generateTriplesForInput(source.subject, input, unwrapNonNull(inputType), namedNode(classUri));
    switch (source.resourceType) {
      case ResourceType.DOCUMENT:
        await new LdpClient().patchDocument(targetUrl, source.quads);
    }
    return source;
  }
  async function handleGetMutateObjectType(source, args, context, info, rootTypes) {
    const classUri = getDirectives(info.returnType).is["class"];
    console.log(source);
    if (source.requestUrl) {
      source.subject = namedNode(args.id);
      source.quads = await getSubGraph(source.quads, classUri, args);
      return source;
    } else {
      throw new Error("A target URL for this request could not be resolved!");
    }
  }
  async function handleDeleteMutation(source, args, context, info) {
    console.log("DELETE MUTATION");
    switch (source.resourceType) {
      case ResourceType.DOCUMENT:
        await new LdpClient().patchDocument(source.requestUrl, null, source.quads);
    }
    return source;
  }
  async function handleUpdateMutation(source, args, context, info) {
    const returnType = info.schema.getType(unwrapNonNull(info.returnType).toString());
    const input = args.input;
    const { inserts, deletes } = generateTriplesForUpdate(source.quads, input, source.subject, returnType);
    switch (source.resourceType) {
      case ResourceType.DOCUMENT:
        await new LdpClient().patchDocument(source.requestUrl, inserts, deletes);
    }
    const store = new Store(source.quads);
    store.removeQuads(deletes);
    store.addQuads(inserts);
    source.quads = store.getQuads(null, null, null, null);
    return source;
  }
}
function TODO() {
  alert("TODO");
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
  if (isNonNullType(type)) {
    return getDirectives(type.ofType);
  }
  return isScalarType(type) ? {} : type.extensions.directives ?? {};
}
function getNewInstanceID(input, resourceType) {
  switch (resourceType) {
    case ResourceType.CONTAINER:
      return "";
    case ResourceType.DOCUMENT:
      return input[ID_FIELD]?.toString() ?? `#${input[SLUG_FIELD]}` ?? uuidv4();
    default:
      return "";
  }
}
function generateTriplesForInput(subject, input, inputDefinition, classUri) {
  const quads = [];
  quads.push(quad(subject, RDFS.a, classUri));
  return Object.values(inputDefinition.getFields()).filter((field) => field.name !== "slug" && field.name !== "id").reduce((acc, field) => {
    if (field.name in input) {
      acc.push(quad(subject, namedNode(getDirectives(field).property["iri"]), literal(input[field.name])));
    }
    return acc;
  }, quads);
}
function generateTriplesForUpdate(source, input, subject, objectTypeDefinition) {
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
export {
  fieldResolver
};
