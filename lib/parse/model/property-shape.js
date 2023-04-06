"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }require('../../chunk-S65R2BUY.js');
var _graphql = require('graphql');
var _n3 = require('n3');
var _commons = require('../../commons');
const { namedNode } = _n3.DataFactory;
class PropertyShape {
  constructor(quads, context) {
    this.quads = quads;
    this.context = context;
    const store = new (0, _n3.Store)(quads);
    this.name = _nullishCoalesce(this.parseObject(store, _commons.vocab.SHACL.name), () => ( _commons.utils.parseNameFromUri(this.parseObject(store, _commons.vocab.SHACL.path))));
    this.description = this.parseObject(store, _commons.vocab.SHACL.description);
    this.type = this.parseType(store);
    this.path = this.parseObject(store, _commons.vocab.SHACL.path);
    const minCount = this.parseObject(store, _commons.vocab.SHACL.minCount);
    this.minCount = minCount ? parseInt(minCount) : void 0;
    const maxCount = this.parseObject(store, _commons.vocab.SHACL.maxCount);
    this.maxCount = maxCount ? parseInt(maxCount) : void 0;
    this.className = this.parseClass(store);
  }
  parseObject(store, predicate, throwError = false) {
    const obj = store.getObjects(null, predicate, null);
    if (obj && obj.length === 1) {
      return obj.at(0).value;
    } else if (throwError) {
      throw new Error(`Could not find a ${predicate.id} for PropertyShape.`);
    } else {
      return void 0;
    }
  }
  parseType(store) {
    const type = this.parseObject(store, _commons.vocab.SHACL.datatype);
    return this.dataTypeToGraphQLType(type);
  }
  parseClass(store) {
    const clazz = this.parseObject(store, _commons.vocab.SHACL.class);
    return this.findMatchingShapeType(clazz);
  }
  dataTypeToGraphQLType(datatype) {
    switch (datatype) {
      case _commons.vocab.XSD.int.value:
        return _graphql.GraphQLInt;
      case _commons.vocab.XSD.float.value:
        return _graphql.GraphQLFloat;
      case _commons.vocab.RDFS.langString.value:
      case _commons.vocab.XSD.string.value:
        return _graphql.GraphQLString;
      case _commons.vocab.XSD.boolean.value:
        return _graphql.GraphQLFloat;
      default:
        return void 0;
    }
  }
  findMatchingShapeType(clazz) {
    if (!clazz) {
      return void 0;
    }
    const match = this.context.getStore().getQuads(null, _commons.vocab.SHACL.targetClass, namedNode(clazz), null);
    if (match && match.length === 1) {
      return _commons.utils.parseNameFromUri(match.at(0).subject.value);
    }
    return void 0;
  }
  get class() {
    return () => {
      const type = this.context.getGraphQLObjectTypes().find((type2) => type2.name === this.className);
      if (type) {
      } else {
        console.log(`No Shape found for property ${this.name} ==> IGNORE`);
      }
      return type;
    };
  }
}


exports.PropertyShape = PropertyShape;
