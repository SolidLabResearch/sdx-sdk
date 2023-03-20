import {
  __decorateClass
} from "./chunk-G42LTC7K.mjs";
import axios from "axios";
import { DirectiveLocation, GraphQLDirective, GraphQLID, GraphQLList, GraphQLNonNull, GraphQLObjectType, GraphQLSchema, GraphQLString } from "graphql";
import { DataFactory, Parser } from "n3";
import { autoInjectable, singleton } from "tsyringe";
import { Context } from "./context.js";
const { namedNode } = DataFactory;
const ID_FIELD = {
  id: {
    description: "Auto-generated property that will be assigned to the `iri` of the Thing that is being queried.",
    type: new GraphQLNonNull(GraphQLID),
    extensions: {
      directives: {
        "identifier": {}
      }
    }
  }
};
const IDENTIFIER_DIRECTIVE = new GraphQLDirective({
  name: "identifier",
  locations: [DirectiveLocation.FIELD_DEFINITION]
});
const IS_DIRECTIVE = new GraphQLDirective({
  name: "is",
  args: { class: { type: GraphQLString } },
  locations: [DirectiveLocation.OBJECT]
});
const PROPERTY_DIRECTIVE = new GraphQLDirective({
  name: "property",
  args: { iri: { type: GraphQLString } },
  locations: [DirectiveLocation.FIELD_DEFINITION]
});
let ShaclReaderService = class {
  constructor() {
    this._cache = [];
    this.primed = false;
    this.parser = new Parser({ format: "turtle" });
  }
  async primeCache(uri) {
    const response = await axios.get(uri + "/index.json");
    this._cache = [];
    for (let entry of response.data.entries) {
      const txt = await axios.get(uri + "/" + entry);
      this._cache.push(...this.parser.parse(txt.data));
    }
    this.primed = true;
  }
  async parseSHACLs(uri) {
    const context = new Context(this._cache, this.generateObjectType);
    return new GraphQLSchema({
      query: this.generateEntryPoints(context.getGraphQLObjectTypes()),
      directives: [IS_DIRECTIVE, PROPERTY_DIRECTIVE, IDENTIFIER_DIRECTIVE]
    });
  }
  /**
   * Generates the entry points for the GraphQL Query schema
   * @param types 
   * @returns 
   */
  generateEntryPoints(types) {
    const decapitalize = (str) => str.slice(0, 1).toLowerCase() + str.slice(1);
    const plural = (str) => `${str}Collection`;
    const query = new GraphQLObjectType({
      name: "RootQueryType",
      fields: types.reduce((prev, type) => ({
        ...prev,
        // Singular type
        [decapitalize(type.name)]: {
          type,
          args: { id: { type: GraphQLString } }
        },
        // Multiple types
        [plural(decapitalize(type.name))]: {
          type: new GraphQLList(type)
        }
      }), {})
    });
    return query;
  }
  /**
   * Generates a GraphQLObjectType from a Shape
   * @param shape 
   * @returns 
   */
  generateObjectType(shape) {
    const applyMinMaxCount = (propertyShape, type) => {
      let result = type;
      if (!propertyShape.maxCount || propertyShape.maxCount && propertyShape.maxCount > 1) {
        result = new GraphQLList(result);
      }
      if (propertyShape.minCount && propertyShape.minCount > 0) {
        result = new GraphQLNonNull(result);
      }
      return result;
    };
    const props = () => shape.propertyShapes.reduce((prev, prop) => {
      const propType = prop.type ?? prop.class();
      if (!propType) {
        return prev;
      } else {
        return {
          ...prev,
          [prop.name]: {
            type: applyMinMaxCount(prop, propType),
            description: prop.description,
            extensions: {
              directives: {
                property: { iri: prop.path }
              }
            }
          }
        };
      }
    }, ID_FIELD);
    return new GraphQLObjectType({
      name: shape.name,
      fields: props,
      extensions: {
        directives: {
          is: { class: shape.targetClass }
        }
      }
    });
  }
};
ShaclReaderService = __decorateClass([
  singleton(),
  autoInjectable()
], ShaclReaderService);
var ERROR = /* @__PURE__ */ ((ERROR2) => {
  ERROR2["NO_SHACL_SCHEMAS"] = `No shacl schema's`;
  return ERROR2;
})(ERROR || {});
export {
  ShaclReaderService
};
