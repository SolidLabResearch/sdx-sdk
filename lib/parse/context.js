"use strict";Object.defineProperty(exports, "__esModule", {value: true});require('../chunk-S65R2BUY.js');
var _n3 = require('n3');
var _model = require('./model');
var _commons = require('../commons');
class Context {
  /**
   * Context object for conversion from SHACL to GraphQL Schema
   * @param quads All quads
   * @param objectTypeConverter A function (closure) that converts a Shape into a GraphQLObjectType
   */
  constructor(quads, objectTypeConverter) {
    this.inputTypes = [];
    this.store = new (0, _n3.Store)(quads);
    this.blankNodes = this.extractBlankNodes(quads);
    this.shapes = this.extractShapes(this.store);
    this.types = this.extractTypes(this.shapes, objectTypeConverter);
  }
  /**
   * A store with all quads.
   * @returns 
   */
  getStore() {
    return this.store;
  }
  getShapes() {
    return this.shapes;
  }
  getGraphQLObjectTypes() {
    return this.types;
  }
  getBlankNodes() {
    return this.blankNodes;
  }
  getInputTypes() {
    return this.inputTypes;
  }
  extractShapes(store) {
    const shapes = [];
    const quads = store.getSubjects(_commons.vocab.RDFS.a, _commons.vocab.SHACL.NodeShape, null).flatMap((sub) => store.getQuads(sub, null, null, null));
    for (const entry of _commons.utils.groupBySubject(quads).entries()) {
      shapes.push(new (0, _model.Shape)(entry[1], this));
    }
    return shapes;
  }
  extractTypes(shapes, objectTypeConverter) {
    return shapes.map(objectTypeConverter);
  }
  extractBlankNodes(quads) {
    return quads.filter((quad) => quad.subject.termType === "BlankNode");
  }
}


exports.Context = Context;
