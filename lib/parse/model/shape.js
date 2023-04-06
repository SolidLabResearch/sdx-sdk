"use strict";Object.defineProperty(exports, "__esModule", {value: true});require('../../chunk-S65R2BUY.js');
var _n3 = require('n3');
var _propertyshapejs = require('./property-shape.js');
var _commons = require('../../commons');
class Shape {
  /**
   * Parse relevant quads to Shapes
   * @param quads The quads that make up the Shape
   * @param context Any toplevel quads that have a BlankNode subject
   */
  constructor(quads, context) {
    this.quads = quads;
    const store = new (0, _n3.Store)(quads);
    this.name = this.parseName(store);
    this.targetClass = this.parseObject(store, _commons.vocab.SHACL.targetClass);
    this.propertyShapes = this.parsePropertyShapes(store, context);
  }
  parseName(store) {
    const sub = store.getSubjects(_commons.vocab.RDFS.a, _commons.vocab.SHACL.NodeShape, null);
    if (sub && sub.length === 1) {
      return _commons.utils.parseNameFromUri(sub.at(0).value);
    } else {
      throw new Error("There must be just one Subject for 'a' NodeShape.");
    }
  }
  parseObject(store, predicate, throwError = false) {
    const obj = store.getObjects(null, predicate, null);
    if (obj && obj.length === 1) {
      return obj.at(0).value;
    } else if (throwError) {
      throw new Error(`Could not find a ${predicate.id} for Shape.`);
    } else {
      return void 0;
    }
  }
  parsePropertyShapes(store, context) {
    return store.getQuads(null, _commons.vocab.SHACL.property, null, null).map(({ object: quadObject }) => {
      if (quadObject.termType === "BlankNode") {
        const propertyQuads = context.getBlankNodes().filter((quad) => quad.subject.equals(quadObject));
        return new (0, _propertyshapejs.PropertyShape)(propertyQuads, context);
      }
    }).filter((item) => item !== void 0);
  }
}


exports.Shape = Shape;
