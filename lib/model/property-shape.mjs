import "../chunk-G42LTC7K.mjs";
import { GraphQLFloat, GraphQLInt, GraphQLString } from "graphql";
import { DataFactory, Store } from "n3";
import { parseNameFromUri } from "../util.js";
import { RDFS, SHACL, XSD } from "../vocab.js";
const { namedNode } = DataFactory;
class PropertyShape {
  constructor(quads, context) {
    this.quads = quads;
    this.context = context;
    const store = new Store(quads);
    this.name = this.parseObject(store, SHACL.name) ?? parseNameFromUri(this.parseObject(store, SHACL.path));
    this.description = this.parseObject(store, SHACL.description);
    this.type = this.parseType(store);
    this.path = this.parseObject(store, SHACL.path);
    const minCount = this.parseObject(store, SHACL.minCount);
    this.minCount = minCount ? parseInt(minCount) : void 0;
    const maxCount = this.parseObject(store, SHACL.maxCount);
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
    const type = this.parseObject(store, SHACL.datatype);
    return this.dataTypeToGraphQLType(type);
  }
  parseClass(store) {
    const clazz = this.parseObject(store, SHACL.class);
    return this.findMatchingShapeType(clazz);
  }
  dataTypeToGraphQLType(datatype) {
    switch (datatype) {
      case XSD.int.value:
        return GraphQLInt;
      case XSD.float.value:
        return GraphQLFloat;
      case RDFS.langString.value:
      case XSD.string.value:
        return GraphQLString;
      case XSD.boolean.value:
        return GraphQLFloat;
      default:
        return void 0;
    }
  }
  findMatchingShapeType(clazz) {
    if (!clazz) {
      return void 0;
    }
    const match = this.context.getStore().getQuads(null, SHACL.targetClass, namedNode(clazz), null);
    if (match && match.length === 1) {
      return parseNameFromUri(match.at(0).subject.value);
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
export {
  PropertyShape
};
