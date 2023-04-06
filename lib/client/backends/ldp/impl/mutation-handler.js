"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }require('../../../../chunk-S65R2BUY.js');
var _graphql = require('graphql');
var _n3 = require('n3');
var _uuid = require('uuid');
var _commons = require('../../../../commons');
var _targetresolvers = require('../target-resolvers');
var _utils = require('./utils');
const { literal, namedNode, quad } = _n3.DataFactory;
const ID_FIELD = "id";
const SLUG_FIELD = "slug";
class MutationHandler {
  constructor(ldpClient) {
    this.ldpClient = ldpClient;
  }
  async handleMutation(source, args, context, info, rootTypes) {
    const { returnType, schema, fieldName, parentType, fieldNodes, path, rootValue, operation } = info;
    if (rootTypes.includes(parentType.name)) {
      const className = this.getDirectives(returnType).is["class"];
      const targetUrl = await context.resolver.resolve(className, new (0, _targetresolvers.TargetResolverContext)(this.ldpClient));
      const graph = await _utils.getGraph.call(void 0, targetUrl.toString());
      source.quads = await _utils.getSubGraph.call(void 0, graph, className, args);
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
    source.queryOverride = true;
    return source;
  }
  async handleCreateMutation(source, args, context, info, rootTypes) {
    const className = this.getDirectives(info.returnType).is["class"];
    const targetUrl = await context.resolver.resolve(className, new (0, _targetresolvers.TargetResolverContext)(this.ldpClient));
    const input = args.input;
    source.subject = namedNode(this.getNewInstanceID(input, source.resourceType));
    const inputType = info.parentType.getFields()[info.fieldName].args.find((arg) => arg.name === "input").type;
    source.quads = this.generateTriplesForInput(source.subject, input, _commons.utils.unwrapNonNull(inputType), namedNode(className));
    switch (source.resourceType) {
      case _utils.ResourceType.DOCUMENT:
        await new (0, _commons.LdpClient)().patchDocument(targetUrl.toString(), source.quads);
    }
    return this.executeWithQueryHandler(source);
  }
  async handleGetMutateObjectType(source, args, context, info, rootTypes) {
    const className = _utils.getDirectives.call(void 0, info.returnType).is["class"];
    const targetUrl = await context.resolver.resolve(className, new (0, _targetresolvers.TargetResolverContext)(this.ldpClient));
    if (targetUrl.toString()) {
      source.subject = namedNode(args.id);
      source.quads = await _utils.getSubGraph.call(void 0, source.quads, className, args);
      source.parentClassIri = className;
      return source;
    } else {
      throw new Error("A target URL for this request could not be resolved!");
    }
  }
  async handleDeleteMutation(source, args, context, info) {
    console.log("DELETE MUTATION");
    const targetUrl = await context.resolver.resolve(source.parentClassIri, new (0, _targetresolvers.TargetResolverContext)(this.ldpClient));
    switch (source.resourceType) {
      case _utils.ResourceType.DOCUMENT:
        await new (0, _commons.LdpClient)().patchDocument(targetUrl.toString(), null, source.quads);
    }
    return this.executeWithQueryHandler(source);
  }
  async handleUpdateMutation(source, args, context, info) {
    const returnType = info.schema.getType(_commons.utils.unwrapNonNull(info.returnType).toString());
    const targetUrl = await context.resolver.resolve(source.parentClassIri, new (0, _targetresolvers.TargetResolverContext)(this.ldpClient));
    const input = args.input;
    const { inserts, deletes } = this.generateTriplesForUpdate(source.quads, input, source.subject, returnType);
    switch (source.resourceType) {
      case _utils.ResourceType.DOCUMENT:
        await new (0, _commons.LdpClient)().patchDocument(targetUrl.toString(), inserts, deletes);
    }
    const store = new (0, _n3.Store)(source.quads);
    store.removeQuads(deletes);
    store.addQuads(inserts);
    source.quads = store.getQuads(null, null, null, null);
    return this.executeWithQueryHandler(source);
  }
  getDirectives(type) {
    if (_graphql.isListType.call(void 0, type)) {
      return _utils.getDirectives.call(void 0, type.ofType);
    }
    if (_graphql.isNonNullType.call(void 0, type)) {
      return _utils.getDirectives.call(void 0, type.ofType);
    }
    return _graphql.isScalarType.call(void 0, type) ? {} : _nullishCoalesce(type.extensions.directives, () => ( {}));
  }
  getNewInstanceID(input, resourceType) {
    switch (resourceType) {
      case _utils.ResourceType.CONTAINER:
        return "";
      case _utils.ResourceType.DOCUMENT:
        return _nullishCoalesce(_nullishCoalesce(_optionalChain([input, 'access', _ => _[ID_FIELD], 'optionalAccess', _2 => _2.toString, 'call', _3 => _3()]), () => ( `#${input[SLUG_FIELD]}`)), () => ( _uuid.v4.call(void 0, )));
      default:
        return "";
    }
  }
  generateTriplesForInput(subject, input, inputDefinition, classUri) {
    const quads = [];
    quads.push(quad(subject, _commons.vocab.RDFS.a, classUri));
    return Object.values(inputDefinition.getFields()).filter((field) => field.name !== "slug" && field.name !== "id").reduce((acc, field) => {
      if (field.name in input) {
        acc.push(quad(subject, namedNode(_utils.getDirectives.call(void 0, field).property["iri"]), literal(input[field.name])));
      }
      return acc;
    }, quads);
  }
  generateTriplesForUpdate(source, input, subject, objectTypeDefinition) {
    const store = new (0, _n3.Store)(source);
    const inserts = [];
    const deletes = [];
    Object.entries(input).forEach(([fieldName, value]) => {
      const fieldDef = objectTypeDefinition.getFields()[fieldName];
      const propertyIri = _utils.getDirectives.call(void 0, fieldDef).property["iri"];
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
  TODO() {
    alert("TODO");
  }
  executeWithQueryHandler(source) {
    return { ...source, queryOverride: true };
  }
}


exports.MutationHandler = MutationHandler;
