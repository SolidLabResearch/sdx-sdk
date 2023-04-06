"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; } function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }

var _chunkS65R2BUYjs = require('../chunk-S65R2BUY.js');
var _axios = require('axios'); var _axios2 = _interopRequireDefault(_axios);
var _graphql = require('graphql');
var _n3 = require('n3');
var _tsyringe = require('tsyringe');
var _context = require('./context');
var _commons = require('../commons');
const { namedNode } = _n3.DataFactory;
const ID_FIELD = {
  id: {
    description: "Auto-generated property that will be assigned to the `iri` of the Thing that is being queried.",
    type: new (0, _graphql.GraphQLNonNull)(_graphql.GraphQLID),
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
    type: _graphql.GraphQLID
  }
};
const SLUG_MUTATOR_FIELD = {
  slug: {
    description: `Optional slug that is combined with the context of the request to generate an identifier for the new instance. One of the 'id' or 'slug' fields must be set!`,
    type: _graphql.GraphQLString
  }
};
const IDENTIFIER_DIRECTIVE = new (0, _graphql.GraphQLDirective)({
  name: "identifier",
  locations: [_graphql.DirectiveLocation.FIELD_DEFINITION]
});
const IS_DIRECTIVE = new (0, _graphql.GraphQLDirective)({
  name: "is",
  args: { class: { type: _graphql.GraphQLString } },
  locations: [_graphql.DirectiveLocation.OBJECT, _graphql.DirectiveLocation.INPUT_OBJECT]
});
const PROPERTY_DIRECTIVE = new (0, _graphql.GraphQLDirective)({
  name: "property",
  args: { iri: { type: _graphql.GraphQLString } },
  locations: [_graphql.DirectiveLocation.FIELD_DEFINITION, _graphql.DirectiveLocation.INPUT_FIELD_DEFINITION]
});
const ROOT_QUERY_TYPE = "Query";
const ROOT_MUTATION_TYPE = "Mutation";
let ShaclReaderService = class {
  constructor() {
    this._cache = [];
    this.primed = false;
    this.parser = new (0, _n3.Parser)({ format: "turtle" });
  }
  async primeCache(uri) {
    const response = await _axios2.default.get(uri + "/index.json");
    this._cache = [];
    for (let entry of response.data.entries) {
      const txt = await _axios2.default.get(uri + "/" + entry);
      this._cache.push(...this.parser.parse(txt.data));
    }
    this.primed = true;
  }
  async parseSHACLs(uri) {
    const context = new (0, _context.Context)(this._cache, this.generateObjectType);
    return new (0, _graphql.GraphQLSchema)({
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
    const query = new (0, _graphql.GraphQLObjectType)({
      name: ROOT_QUERY_TYPE,
      fields: types.reduce((prev, type) => ({
        ...prev,
        // Singular type
        [_commons.utils.decapitalize(type.name)]: {
          type,
          args: { id: { type: _graphql.GraphQLString } }
        },
        // Multiple types
        [_commons.utils.plural(_commons.utils.decapitalize(type.name))]: {
          type: new (0, _graphql.GraphQLList)(type)
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
    const mutation = new (0, _graphql.GraphQLObjectType)({
      name: ROOT_MUTATION_TYPE,
      fields: types.reduce((prev, type) => {
        const createName = `create${_commons.utils.capitalize(type.name)}`;
        const mutateName = `mutate${_commons.utils.capitalize(type.name)}`;
        return {
          ...prev,
          // create type
          [createName]: {
            type: new (0, _graphql.GraphQLNonNull)(type),
            args: { input: { type: new (0, _graphql.GraphQLNonNull)(this.generateInputObjectType(type, `${_commons.utils.capitalize(createName)}Input`, "create", context)) } }
          },
          // edit types
          [mutateName]: {
            type: this.generateMutationObjectType(type, context),
            args: { id: { type: new (0, _graphql.GraphQLNonNull)(_graphql.GraphQLID) } }
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
      let fields = Object.fromEntries(Object.entries(type.getFields()).filter(([_, field]) => _commons.utils.isOrContainsScalar(field.type)).filter(([_, field]) => !isIdentifier(field)).map(([name2, field]) => [name2, toInputField(field, mutationType)]));
      if (mutationType === "create") {
        fields = {
          ...ID_MUTATOR_FIELD,
          ...SLUG_MUTATOR_FIELD,
          ...fields
        };
      }
      inputType = new (0, _graphql.GraphQLInputObjectType)({
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
    return new (0, _graphql.GraphQLObjectType)({
      name: `${_commons.utils.capitalize(type.name)}Mutation`,
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
      delete: { type: new (0, _graphql.GraphQLNonNull)(type) }
    };
    const inputType = this.generateInputObjectType(type, `Update${_commons.utils.capitalize(type.name)}Input`, "update", context);
    if (Object.keys(inputType.getFields()).length > 0) {
      fields.update = {
        type: new (0, _graphql.GraphQLNonNull)(type),
        args: { input: { type: new (0, _graphql.GraphQLNonNull)(inputType) } }
      };
    }
    const extra = Object.values(type.getFields()).reduce((acc, field) => {
      if (_commons.utils.isOrContainsObjectType(field.type)) {
        const isListLike = _graphql.isListType.call(void 0, field.type) || _graphql.isNonNullType.call(void 0, field.type) && _graphql.isListType.call(void 0, field.type.ofType);
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
    const addName = `add${_commons.utils.capitalize(field.name)}`;
    const removeName = `remove${_commons.utils.capitalize(field.name)}`;
    const linkName = `link${_commons.utils.capitalize(field.name)}`;
    const unlinkName = `unlink${_commons.utils.capitalize(field.name)}`;
    const returnType = new (0, _graphql.GraphQLNonNull)(parentType);
    const fieldType = _commons.utils.toActualType(field.type);
    return {
      [addName]: {
        type: returnType,
        args: {
          input: {
            type: new (0, _graphql.GraphQLNonNull)(this.generateInputObjectType(fieldType, `Create${_commons.utils.capitalize(fieldType.name)}Input`, "create", context))
          }
        }
      },
      [removeName]: {
        type: returnType,
        args: { id: { type: new (0, _graphql.GraphQLNonNull)(_graphql.GraphQLID) } }
      },
      [linkName]: {
        type: returnType,
        args: { id: { type: new (0, _graphql.GraphQLNonNull)(_graphql.GraphQLID) } }
      },
      [unlinkName]: {
        type: returnType,
        args: { id: { type: new (0, _graphql.GraphQLNonNull)(_graphql.GraphQLID) } }
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
    const setName = `set${_commons.utils.capitalize(field.name)}`;
    const clearName = `clear${_commons.utils.capitalize(field.name)}`;
    const returnType = new (0, _graphql.GraphQLNonNull)(parentType);
    const fieldType = _commons.utils.toActualType(field.type);
    return {
      [setName]: {
        type: returnType,
        args: {
          input: {
            type: new (0, _graphql.GraphQLNonNull)(this.generateInputObjectType(fieldType, `Create${_commons.utils.capitalize(fieldType.name)}Input`, "create", context))
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
        result = new (0, _graphql.GraphQLList)(result);
      }
      if (propertyShape.minCount && propertyShape.minCount > 0) {
        result = new (0, _graphql.GraphQLNonNull)(result);
      }
      return result;
    };
    const props = () => shape.propertyShapes.reduce((prev, prop) => {
      const propType = _nullishCoalesce(prop.type, () => ( prop.class()));
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
    return new (0, _graphql.GraphQLObjectType)({
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
ShaclReaderService = exports.ShaclReaderService = _chunkS65R2BUYjs.__decorateClass.call(void 0, [
  _tsyringe.singleton.call(void 0, ),
  _tsyringe.autoInjectable.call(void 0, )
], ShaclReaderService);
var ERROR = /* @__PURE__ */ ((ERROR2) => {
  ERROR2["NO_SHACL_SCHEMAS"] = `No shacl schema's`;
  return ERROR2;
})(ERROR || {});
function toInputField(field, mutationType) {
  let fieldType = toScalarInputType(field.type);
  fieldType = mutationType === "update" && _graphql.isNonNullType.call(void 0, fieldType) ? fieldType.ofType : fieldType;
  return {
    type: fieldType,
    description: field.description,
    extensions: field.extensions
  };
}
function toScalarInputType(type, modifiers = {}) {
  if (_graphql.isListType.call(void 0, type)) {
    let res2 = toScalarInputType(type.ofType, { collection: true });
    if (modifiers.collection) {
      res2 = new (0, _graphql.GraphQLList)(res2);
    }
    if (modifiers.nonNull) {
      res2 = new (0, _graphql.GraphQLNonNull)(res2);
    }
    return res2;
  }
  if (_graphql.isNonNullType.call(void 0, type)) {
    let res2 = toScalarInputType(type.ofType, { nonNull: true });
    if (modifiers.collection) {
      res2 = new (0, _graphql.GraphQLList)(res2);
    }
    if (modifiers.nonNull) {
      res2 = new (0, _graphql.GraphQLNonNull)(res2);
    }
    return res2;
  }
  let res = _graphql.specifiedScalarTypes.find((t) => t.name === type.toString());
  if (!res) {
    throw new Error(`${type.toString()} is not a Scalar!`);
  }
  if (modifiers.collection) {
    res = new (0, _graphql.GraphQLList)(res);
  }
  if (modifiers.nonNull) {
    res = new (0, _graphql.GraphQLNonNull)(res);
  }
  return res;
}
function isIdentifier(field) {
  const directives = field.extensions.directives;
  return directives && directives["identifier"];
}


exports.ShaclReaderService = ShaclReaderService;
