import {
  __decorateClass
} from "../chunk-G42LTC7K.mjs";
import axios from "axios";
import { DirectiveLocation, GraphQLDirective, GraphQLID, GraphQLInputObjectType, GraphQLList, GraphQLNonNull, GraphQLObjectType, GraphQLSchema, GraphQLString, isListType, isNonNullType, specifiedScalarTypes } from "graphql";
import { DataFactory, Parser } from "n3";
import { autoInjectable, singleton } from "tsyringe";
import { Context } from "./context.js";
import { utils } from "../commons";
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
const ID_MUTATOR_FIELD = {
  id: {
    description: `Optional URI to use as an identifier for the new instance. One of the 'id' or 'slug' fields must be set!`,
    type: GraphQLID
  }
};
const SLUG_MUTATOR_FIELD = {
  slug: {
    description: `Optional slug that is combined with the context of the request to generate an identifier for the new instance. One of the 'id' or 'slug' fields must be set!`,
    type: GraphQLString
  }
};
const IDENTIFIER_DIRECTIVE = new GraphQLDirective({
  name: "identifier",
  locations: [DirectiveLocation.FIELD_DEFINITION]
});
const IS_DIRECTIVE = new GraphQLDirective({
  name: "is",
  args: { class: { type: GraphQLString } },
  locations: [DirectiveLocation.OBJECT, DirectiveLocation.INPUT_OBJECT]
});
const PROPERTY_DIRECTIVE = new GraphQLDirective({
  name: "property",
  args: { iri: { type: GraphQLString } },
  locations: [DirectiveLocation.FIELD_DEFINITION, DirectiveLocation.INPUT_FIELD_DEFINITION]
});
const ROOT_QUERY_TYPE = "Query";
const ROOT_MUTATION_TYPE = "Mutation";
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
      mutation: this.generateMutationEntryPoints(context),
      directives: [IS_DIRECTIVE, PROPERTY_DIRECTIVE, IDENTIFIER_DIRECTIVE]
    });
  }
  /**
   * Generates the entry points for the GraphQL Query schema
   * @param types 
   * @returns 
   */
  generateEntryPoints(types) {
    const query = new GraphQLObjectType({
      name: ROOT_QUERY_TYPE,
      fields: types.reduce((prev, type) => ({
        ...prev,
        // Singular type
        [utils.decapitalize(type.name)]: {
          type,
          args: { id: { type: GraphQLString } }
        },
        // Multiple types
        [utils.plural(utils.decapitalize(type.name))]: {
          type: new GraphQLList(type)
        }
      }), {})
    });
    return query;
  }
  /**
  * Generates a Mutation EntryPoint RootMutationType
  * @param types 
  * @returns 
  */
  generateMutationEntryPoints(context) {
    const types = context.getGraphQLObjectTypes();
    const mutation = new GraphQLObjectType({
      name: ROOT_MUTATION_TYPE,
      fields: types.reduce((prev, type) => {
        const createName = `create${utils.capitalize(type.name)}`;
        const mutateName = `mutate${utils.capitalize(type.name)}`;
        return {
          ...prev,
          // create type
          [createName]: {
            type: new GraphQLNonNull(type),
            args: { input: { type: new GraphQLNonNull(this.generateInputObjectType(type, `${utils.capitalize(createName)}Input`, "create", context)) } }
          },
          // edit types
          [mutateName]: {
            type: this.generateMutationObjectType(type, context),
            args: { id: { type: new GraphQLNonNull(GraphQLID) } }
          }
        };
      }, {})
    });
    return mutation;
  }
  /**
   * Generates an InputObject type, typically used as an argument in a mutator (always NonNull)
   * @param type 
   * @param name 
   * @returns 
   */
  generateInputObjectType(type, name, mutationType, context) {
    let inputType = context.getInputTypes().find((type2) => name === type2.name);
    if (!inputType) {
      let fields = Object.fromEntries(Object.entries(type.getFields()).filter(([_, field]) => utils.isOrContainsScalar(field.type)).filter(([_, field]) => !isIdentifier(field)).map(([name2, field]) => [name2, toInputField(field, mutationType)]));
      if (mutationType === "create") {
        fields = {
          ...ID_MUTATOR_FIELD,
          ...SLUG_MUTATOR_FIELD,
          ...fields
        };
      }
      inputType = new GraphQLInputObjectType({
        name,
        fields,
        extensions: type.extensions
      });
      context.getInputTypes().push(inputType);
    }
    return inputType;
  }
  /**
   * Generate the Mutation Type for existing Types
   * @param type Original ObjectType
   * @param context 
   * @returns 
   */
  generateMutationObjectType(type, context) {
    return new GraphQLObjectType({
      name: `${utils.capitalize(type.name)}Mutation`,
      fields: this.generateMutationObjectTypeFields(type, context),
      extensions: type.extensions
    });
  }
  /**
   * Generate the fields for a MutationObjectType
   * @param type Original ObjectType
   * @param context 
   * @returns 
   */
  generateMutationObjectTypeFields(type, context) {
    let fields = {
      delete: { type: new GraphQLNonNull(type) }
    };
    const inputType = this.generateInputObjectType(type, `Update${utils.capitalize(type.name)}Input`, "update", context);
    if (Object.keys(inputType.getFields()).length > 0) {
      fields.update = {
        type: new GraphQLNonNull(type),
        args: { input: { type: new GraphQLNonNull(inputType) } }
      };
    }
    const extra = Object.values(type.getFields()).reduce((acc, field) => {
      if (utils.isOrContainsObjectType(field.type)) {
        const isListLike = isListType(field.type) || isNonNullType(field.type) && isListType(field.type.ofType);
        acc = {
          ...acc,
          ...isListLike ? this.generateMutationObjectTypeFieldsForCollection(field, type, context) : this.generateMutationObjectTypeFieldsForSingular(field, type, context)
          // singular
        };
      }
      return acc;
    }, {});
    return { ...fields, ...extra };
  }
  /**
   * Generate fields for a MutationObjectType when the field of the original has a collection return type
   * @param field Original field
   * @param parentType Original Object Type
   * @param context 
   * @returns 
   */
  generateMutationObjectTypeFieldsForCollection(field, parentType, context) {
    const addName = `add${utils.capitalize(field.name)}`;
    const removeName = `remove${utils.capitalize(field.name)}`;
    const linkName = `link${utils.capitalize(field.name)}`;
    const unlinkName = `unlink${utils.capitalize(field.name)}`;
    const returnType = new GraphQLNonNull(parentType);
    const fieldType = utils.toActualType(field.type);
    return {
      [addName]: {
        type: returnType,
        args: {
          input: {
            type: new GraphQLNonNull(this.generateInputObjectType(fieldType, `Create${utils.capitalize(fieldType.name)}Input`, "create", context))
          }
        }
      },
      [removeName]: {
        type: returnType,
        args: { id: { type: new GraphQLNonNull(GraphQLID) } }
      },
      [linkName]: {
        type: returnType,
        args: { id: { type: new GraphQLNonNull(GraphQLID) } }
      },
      [unlinkName]: {
        type: returnType,
        args: { id: { type: new GraphQLNonNull(GraphQLID) } }
      }
    };
  }
  /**
   * Generate fields for a MutationObjectType when the field of the original has a singular return type
   * @param field Original field
   * @param parentType Original Object Type
   * @param context 
   * @returns 
   */
  generateMutationObjectTypeFieldsForSingular(field, parentType, context) {
    const setName = `set${utils.capitalize(field.name)}`;
    const clearName = `clear${utils.capitalize(field.name)}`;
    const returnType = new GraphQLNonNull(parentType);
    const fieldType = utils.toActualType(field.type);
    return {
      [setName]: {
        type: returnType,
        args: {
          input: {
            type: new GraphQLNonNull(this.generateInputObjectType(fieldType, `Create${utils.capitalize(fieldType.name)}Input`, "create", context))
          }
        }
      },
      [clearName]: {
        type: returnType
      }
    };
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
function toInputField(field, mutationType) {
  let fieldType = toScalarInputType(field.type);
  fieldType = mutationType === "update" && isNonNullType(fieldType) ? fieldType.ofType : fieldType;
  return {
    type: fieldType,
    description: field.description,
    extensions: field.extensions
  };
}
function toScalarInputType(type, modifiers = {}) {
  if (isListType(type)) {
    let res2 = toScalarInputType(type.ofType, { collection: true });
    if (modifiers.collection) {
      res2 = new GraphQLList(res2);
    }
    if (modifiers.nonNull) {
      res2 = new GraphQLNonNull(res2);
    }
    return res2;
  }
  if (isNonNullType(type)) {
    let res2 = toScalarInputType(type.ofType, { nonNull: true });
    if (modifiers.collection) {
      res2 = new GraphQLList(res2);
    }
    if (modifiers.nonNull) {
      res2 = new GraphQLNonNull(res2);
    }
    return res2;
  }
  let res = specifiedScalarTypes.find((t) => t.name === type.toString());
  if (!res) {
    throw new Error(`${type.toString()} is not a Scalar!`);
  }
  if (modifiers.collection) {
    res = new GraphQLList(res);
  }
  if (modifiers.nonNull) {
    res = new GraphQLNonNull(res);
  }
  return res;
}
function isIdentifier(field) {
  const directives = field.extensions.directives;
  return directives && directives["identifier"];
}
export {
  ShaclReaderService
};
