"use strict";Object.defineProperty(exports, "__esModule", {value: true});require('../chunk-S65R2BUY.js');
var _n3 = require('n3');
const { namedNode } = _n3.DataFactory;
const RDFS = {
  a: namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
  langString: namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#langString")
};
const SHACL = {
  class: namedNode("http://www.w3.org/ns/shacl#class"),
  datatype: namedNode("http://www.w3.org/ns/shacl#datatype"),
  description: namedNode("http://www.w3.org/ns/shacl#description"),
  minCount: namedNode("http://www.w3.org/ns/shacl#minCount"),
  maxCount: namedNode("http://www.w3.org/ns/shacl#maxCount"),
  name: namedNode("http://www.w3.org/ns/shacl#name"),
  NodeShape: namedNode("http://www.w3.org/ns/shacl#NodeShape"),
  path: namedNode("http://www.w3.org/ns/shacl#path"),
  PropertyShape: namedNode("http://www.w3.org/ns/shacl#PropertyShape"),
  property: namedNode("http://www.w3.org/ns/shacl#property"),
  targetClass: namedNode("http://www.w3.org/ns/shacl#targetClass")
};
const XSD = {
  int: namedNode("http://www.w3.org/2001/XMLSchema#int"),
  float: namedNode("http://www.w3.org/2001/XMLSchema#float"),
  string: namedNode("http://www.w3.org/2001/XMLSchema#string"),
  boolean: namedNode("http://www.w3.org/2001/XMLSchema#boolean")
};




exports.RDFS = RDFS; exports.SHACL = SHACL; exports.XSD = XSD;
