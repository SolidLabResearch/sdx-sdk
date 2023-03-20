"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; } function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }

var _chunkS65R2BUYjs = require('./chunk-S65R2BUY.js');
var _axios = require('axios'); var _axios2 = _interopRequireDefault(_axios);
var _graphql = require('graphql');
var _n3 = require('n3');
var _tsyringe = require('tsyringe');
var _contextjs = require('./context.js');
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
const IDENTIFIER_DIRECTIVE = new (0, _graphql.GraphQLDirective)({
  name: "identifier",
  locations: [_graphql.DirectiveLocation.FIELD_DEFINITION]
});
const IS_DIRECTIVE = new (0, _graphql.GraphQLDirective)({
  name: "is",
  args: { class: { type: _graphql.GraphQLString } },
  locations: [_graphql.DirectiveLocation.OBJECT]
});
const PROPERTY_DIRECTIVE = new (0, _graphql.GraphQLDirective)({
  name: "property",
  args: { iri: { type: _graphql.GraphQLString } },
  locations: [_graphql.DirectiveLocation.FIELD_DEFINITION]
});
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
    const context = new (0, _contextjs.Context)(this._cache, this.generateObjectType);
    return new (0, _graphql.GraphQLSchema)({
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
    const query = new (0, _graphql.GraphQLObjectType)({
      name: "RootQueryType",
      fields: types.reduce((prev, type) => ({
        ...prev,
        // Singular type
        [decapitalize(type.name)]: {
          type,
          args: { id: { type: _graphql.GraphQLString } }
        },
        // Multiple types
        [plural(decapitalize(type.name))]: {
          type: new (0, _graphql.GraphQLList)(type)
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


exports.ShaclReaderService = ShaclReaderService;
