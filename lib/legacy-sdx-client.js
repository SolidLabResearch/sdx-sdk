"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; } function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }require('./chunk-S65R2BUY.js');
var _axios = require('axios'); var _axios2 = _interopRequireDefault(_axios);
var _graphql = require('graphql');
var _n3 = require('n3');
var _uuid = require('uuid');
var _ldpclientjs = require('./ldp-client.js');
var _typesjs = require('./types.js');
var _utiljs = require('./util.js');
var _vocabjs = require('./vocab.js');
const { namedNode, quad, literal } = _n3.DataFactory;
const ID_FIELD = "id";
const SLUG_FIELD = "slug";
function fieldResolver(location) {
  return async (source, args, context, info) => {
    const { returnType, schema, fieldName, parentType, fieldNodes, path, rootValue, operation } = info;
    if (!source) {
      source = {
        quads: [],
        requestUrl: location,
        resourceType: _typesjs.ResourceType.DOCUMENT
      };
    }
    const rootTypes = [
      _optionalChain([schema, 'access', _ => _.getQueryType, 'call', _2 => _2(), 'optionalAccess', _3 => _3.name]),
      _optionalChain([schema, 'access', _4 => _4.getMutationType, 'call', _5 => _5(), 'optionalAccess', _6 => _6.name]),
      _optionalChain([schema, 'access', _7 => _7.getSubscriptionType, 'call', _8 => _8(), 'optionalAccess', _9 => _9.name])
    ].filter((t) => !!t);
    if ("query" === operation.operation) {
      return handleQuery(source, args, context, info, rootTypes);
    }
    if ("mutation" === operation.operation) {
      return handleMutation(source, args, context, info, rootTypes);
    }
  };
  async function getSubGraphArray(source, className, args) {
    const store = new (0, _n3.Store)(source);
    const quadsOfQuads = store.getSubjects(_vocabjs.RDFS.a, namedNode(className), null).map(async (sub) => await getSubGraph(source, className, { id: sub.value }));
    return Promise.all(quadsOfQuads);
  }
  async function getSubGraph(source, className, args) {
    const store = new (0, _n3.Store)(source);
    const id = _optionalChain([args, 'optionalAccess', _10 => _10.id]);
    let topQuads = store.getSubjects(_vocabjs.RDFS.a, namedNode(className), null).flatMap((sub) => store.getQuads(sub, null, null, null));
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
    const doc = await _axios2.default.get(location2);
    return new (0, _n3.Parser)().parse(doc.data);
  }
  async function handleQuery(source, args, context, info, rootTypes) {
    const { returnType, schema, fieldName, parentType, fieldNodes, path, rootValue, operation } = info;
    if (rootTypes.includes(parentType.name)) {
      const className = getDirectives(returnType).is["class"];
      source.quads = await getGraph(location).then((quads) => getSubGraph(quads, className, args));
    }
    if (_graphql.isListType.call(void 0, returnType)) {
      if (_graphql.isScalarType.call(void 0, returnType.ofType) || _graphql.isNonNullType.call(void 0, returnType.ofType) && _graphql.isScalarType.call(void 0, returnType.ofType.ofType)) {
        const store = new (0, _n3.Store)(source.quads || []);
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
        return (await getSubGraphArray(source.quads, className, {})).map((quads) => ({ ...source, quads }));
      }
    } else {
      if (_graphql.isScalarType.call(void 0, returnType) || _graphql.isNonNullType.call(void 0, returnType) && _graphql.isScalarType.call(void 0, returnType.ofType)) {
        const store = new (0, _n3.Store)(source.quads || []);
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
          return _graphql.defaultFieldResolver.call(void 0, source, args, context, info);
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
    source.quads = generateTriplesForInput(source.subject, input, _utiljs.unwrapNonNull.call(void 0, inputType), namedNode(classUri));
    switch (source.resourceType) {
      case _typesjs.ResourceType.DOCUMENT:
        await new (0, _ldpclientjs.LdpClient)().patchDocument(targetUrl, source.quads);
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
      case _typesjs.ResourceType.DOCUMENT:
        await new (0, _ldpclientjs.LdpClient)().patchDocument(source.requestUrl, null, source.quads);
    }
    return source;
  }
  async function handleUpdateMutation(source, args, context, info) {
    const returnType = info.schema.getType(_utiljs.unwrapNonNull.call(void 0, info.returnType).toString());
    const input = args.input;
    const { inserts, deletes } = generateTriplesForUpdate(source.quads, input, source.subject, returnType);
    switch (source.resourceType) {
      case _typesjs.ResourceType.DOCUMENT:
        await new (0, _ldpclientjs.LdpClient)().patchDocument(source.requestUrl, inserts, deletes);
    }
    const store = new (0, _n3.Store)(source.quads);
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
  if (_graphql.isNonNullType.call(void 0, type)) {
    return getDirectives(type.ofType);
  }
  return _graphql.isScalarType.call(void 0, type) ? {} : _nullishCoalesce(type.extensions.directives, () => ( {}));
}
function getNewInstanceID(input, resourceType) {
  switch (resourceType) {
    case _typesjs.ResourceType.CONTAINER:
      return "";
    case _typesjs.ResourceType.DOCUMENT:
      return _nullishCoalesce(_nullishCoalesce(_optionalChain([input, 'access', _11 => _11[ID_FIELD], 'optionalAccess', _12 => _12.toString, 'call', _13 => _13()]), () => ( `#${input[SLUG_FIELD]}`)), () => ( _uuid.v4.call(void 0, )));
    default:
      return "";
  }
}
function generateTriplesForInput(subject, input, inputDefinition, classUri) {
  const quads = [];
  quads.push(quad(subject, _vocabjs.RDFS.a, classUri));
  return Object.values(inputDefinition.getFields()).filter((field) => field.name !== "slug" && field.name !== "id").reduce((acc, field) => {
    if (field.name in input) {
      acc.push(quad(subject, namedNode(getDirectives(field).property["iri"]), literal(input[field.name])));
    }
    return acc;
  }, quads);
}
function generateTriplesForUpdate(source, input, subject, objectTypeDefinition) {
  const store = new (0, _n3.Store)(source);
  const inserts = [];
  const deletes = [];
  Object.entries(input).forEach(([fieldName, value]) => {
    const fieldDef = objectTypeDefinition.getFields()[fieldName];
    const propertyIri = getDirectives(fieldDef).property["iri"];
    if (value == null) {
      if (_graphql.isNonNullType.call(void 0, fieldDef.type)) {
        throw new Error(`Update input provided null value for non-nullable field '${fieldName}'`);
      }
      deletes.push(...store.getQuads(subject, namedNode(propertyIri), null, null));
    } else {
      deletes.push(...store.getQuads(subject, namedNode(propertyIri), null, null));
      if (_graphql.isListType.call(void 0, fieldDef.type)) {
        inserts.push(...value.map((v) => quad(subject, namedNode(propertyIri), literal(v))));
      } else {
        inserts.push(quad(subject, namedNode(propertyIri), literal(value)));
      }
    }
  });
  return { inserts, deletes };
}


exports.fieldResolver = fieldResolver;
