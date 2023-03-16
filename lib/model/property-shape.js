"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { newObj[key] = obj[key]; } } } newObj.default = obj; return newObj; } } function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }require('../chunk-S65R2BUY.js');
var _scalarsjs = require('graphql/type/scalars.js'); var Scalars = _interopRequireWildcard(_scalarsjs);
var _n3 = require('n3');
var _utiljs = require('../util.js');
var _vocabjs = require('../vocab.js');
const { namedNode } = _n3.DataFactory;
class PropertyShape {
  constructor(quads, context) {
    this.quads = quads;
    this.context = context;
    const store = new (0, _n3.Store)(quads);
    this.name = _nullishCoalesce(this.parseObject(store, _vocabjs.SHACL.name), () => ( _utiljs.parseNameFromUri.call(void 0, this.parseObject(store, _vocabjs.SHACL.path))));
    this.description = this.parseObject(store, _vocabjs.SHACL.description);
    this.type = this.parseType(store);
    this.path = this.parseObject(store, _vocabjs.SHACL.path);
    const minCount = this.parseObject(store, _vocabjs.SHACL.minCount);
    this.minCount = minCount ? parseInt(minCount) : void 0;
    const maxCount = this.parseObject(store, _vocabjs.SHACL.maxCount);
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
    const type = this.parseObject(store, _vocabjs.SHACL.datatype);
    return this.dataTypeToGraphQLType(type);
  }
  parseClass(store) {
    const clazz = this.parseObject(store, _vocabjs.SHACL.class);
    return this.findMatchingShapeType(clazz);
  }
  dataTypeToGraphQLType(datatype) {
    switch (datatype) {
      case _vocabjs.XSD.int.value:
        return Scalars.GraphQLInt;
      case _vocabjs.XSD.float.value:
        return Scalars.GraphQLFloat;
      case _vocabjs.RDFS.langString.value:
      case _vocabjs.XSD.string.value:
        return Scalars.GraphQLString;
      case _vocabjs.XSD.boolean.value:
        return Scalars.GraphQLFloat;
      default:
        return void 0;
    }
  }
  findMatchingShapeType(clazz) {
    if (!clazz) {
      return void 0;
    }
    const match = this.context.getStore().getQuads(null, _vocabjs.SHACL.targetClass, namedNode(clazz), null);
    if (match && match.length === 1) {
      return _utiljs.parseNameFromUri.call(void 0, match.at(0).subject.value);
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
