import "../../chunk-G42LTC7K.mjs";
import { GraphQLFloat, GraphQLInt, GraphQLString } from "graphql";
import { DataFactory, Store } from "n3";
import { utils, vocab } from "../../commons";
const { namedNode } = DataFactory;
class PropertyShape {
  constructor(quads, context) {
    this.quads = quads;
    this.context = context;
    const store = new Store(quads);
    this.name = this.parseObject(store, vocab.SHACL.name) ?? utils.parseNameFromUri(this.parseObject(store, vocab.SHACL.path));
    this.description = this.parseObject(store, vocab.SHACL.description);
    this.type = this.parseType(store);
    this.path = this.parseObject(store, vocab.SHACL.path);
    const minCount = this.parseObject(store, vocab.SHACL.minCount);
    this.minCount = minCount ? parseInt(minCount) : void 0;
    const maxCount = this.parseObject(store, vocab.SHACL.maxCount);
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
    const type = this.parseObject(store, vocab.SHACL.datatype);
    return this.dataTypeToGraphQLType(type);
  }
  parseClass(store) {
    const clazz = this.parseObject(store, vocab.SHACL.class);
    return this.findMatchingShapeType(clazz);
  }
  dataTypeToGraphQLType(datatype) {
    switch (datatype) {
      case vocab.XSD.int.value:
        return GraphQLInt;
      case vocab.XSD.float.value:
        return GraphQLFloat;
      case vocab.RDFS.langString.value:
      case vocab.XSD.string.value:
        return GraphQLString;
      case vocab.XSD.boolean.value:
        return GraphQLFloat;
      default:
        return void 0;
    }
  }
  findMatchingShapeType(clazz) {
    if (!clazz) {
      return void 0;
    }
    const match = this.context.getStore().getQuads(null, vocab.SHACL.targetClass, namedNode(clazz), null);
    if (match && match.length === 1) {
      return utils.parseNameFromUri(match.at(0).subject.value);
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
