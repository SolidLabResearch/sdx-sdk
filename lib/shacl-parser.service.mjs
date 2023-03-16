import {
  __decorateClass
} from "./chunk-G42LTC7K.mjs";
import { readFile, readdir, lstat } from "fs/promises";
import { GraphQLObjectType, GraphQLSchema } from "graphql";
import { DirectiveLocation } from "graphql/language/directiveLocation.js";
import { GraphQLList, GraphQLNonNull } from "graphql/type/definition.js";
import { GraphQLDirective } from "graphql/type/directives.js";
import * as Scalars from "graphql/type/scalars.js";
import { DataFactory, Parser } from "n3";
import { autoInjectable, singleton } from "tsyringe";
import { Context } from "./context.js";
const { namedNode } = DataFactory;
const ID_FIELD = {
  id: {
    description: "Auto-generated property that will be assigned to the `iri` of the Thing that is being queried.",
    type: new GraphQLNonNull(Scalars.GraphQLID),
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
  args: { class: { type: Scalars.GraphQLString } },
  locations: [DirectiveLocation.OBJECT]
});
const PROPERTY_DIRECTIVE = new GraphQLDirective({
  name: "property",
  args: { iri: { type: Scalars.GraphQLString } },
  locations: [DirectiveLocation.FIELD_DEFINITION]
});
let ShaclParserService = class {
  constructor() {
    this.parser = new Parser({ format: "turtle" });
  }
  async parseSHACL(path) {
    const stat = await lstat(path);
    if (stat.isDirectory() && (await readdir(path)).length === 0) {
      throw "No shacl schema's" /* NO_SHACL_SCHEMAS */;
    }
    const parsePath = async (pathLike) => {
      const stat2 = await lstat(pathLike);
      let quads = [];
      if (stat2.isDirectory()) {
        for (const fileName of await readdir(pathLike)) {
          quads.push(...await parsePath(`${pathLike}/${fileName}`));
        }
      } else {
        const source = await readFile(pathLike);
        quads.push(...this.parser.parse(source.toString()));
      }
      return quads;
    };
    const context = new Context(await parsePath(path), this.generateObjectType);
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
          args: { id: { type: Scalars.GraphQLString } }
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
ShaclParserService = __decorateClass([
  singleton(),
  autoInjectable()
], ShaclParserService);
var ERROR = /* @__PURE__ */ ((ERROR2) => {
  ERROR2["NO_SHACL_SCHEMAS"] = `No shacl schema's`;
  return ERROR2;
})(ERROR || {});
export {
  ShaclParserService
};
