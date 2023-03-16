"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { newObj[key] = obj[key]; } } } newObj.default = obj; return newObj; } } function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }

var _chunkS65R2BUYjs = require('./chunk-S65R2BUY.js');
var _promises = require('fs/promises');
var _graphql = require('graphql');
var _directiveLocationjs = require('graphql/language/directiveLocation.js');
var _definitionjs = require('graphql/type/definition.js');
var _directivesjs = require('graphql/type/directives.js');
var _scalarsjs = require('graphql/type/scalars.js'); var Scalars = _interopRequireWildcard(_scalarsjs);
var _n3 = require('n3');
var _tsyringe = require('tsyringe');
var _contextjs = require('./context.js');
const { namedNode } = _n3.DataFactory;
const ID_FIELD = {
  id: {
    description: "Auto-generated property that will be assigned to the `iri` of the Thing that is being queried.",
    type: new (0, _definitionjs.GraphQLNonNull)(Scalars.GraphQLID),
    extensions: {
      directives: {
        "identifier": {}
      }
    }
  }
};
const IDENTIFIER_DIRECTIVE = new (0, _directivesjs.GraphQLDirective)({
  name: "identifier",
  locations: [_directiveLocationjs.DirectiveLocation.FIELD_DEFINITION]
});
const IS_DIRECTIVE = new (0, _directivesjs.GraphQLDirective)({
  name: "is",
  args: { class: { type: Scalars.GraphQLString } },
  locations: [_directiveLocationjs.DirectiveLocation.OBJECT]
});
const PROPERTY_DIRECTIVE = new (0, _directivesjs.GraphQLDirective)({
  name: "property",
  args: { iri: { type: Scalars.GraphQLString } },
  locations: [_directiveLocationjs.DirectiveLocation.FIELD_DEFINITION]
});
let ShaclParserService = class {
  constructor() {
    this.parser = new (0, _n3.Parser)({ format: "turtle" });
  }
  async parseSHACL(path) {
    const stat = await _promises.lstat.call(void 0, path);
    if (stat.isDirectory() && (await _promises.readdir.call(void 0, path)).length === 0) {
      throw "No shacl schema's" /* NO_SHACL_SCHEMAS */;
    }
    const parsePath = async (pathLike) => {
      const stat2 = await _promises.lstat.call(void 0, pathLike);
      let quads = [];
      if (stat2.isDirectory()) {
        for (const fileName of await _promises.readdir.call(void 0, pathLike)) {
          quads.push(...await parsePath(`${pathLike}/${fileName}`));
        }
      } else {
        const source = await _promises.readFile.call(void 0, pathLike);
        quads.push(...this.parser.parse(source.toString()));
      }
      return quads;
    };
    const context = new (0, _contextjs.Context)(await parsePath(path), this.generateObjectType);
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
          args: { id: { type: Scalars.GraphQLString } }
        },
        // Multiple types
        [plural(decapitalize(type.name))]: {
          type: new (0, _definitionjs.GraphQLList)(type)
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
        result = new (0, _definitionjs.GraphQLList)(result);
      }
      if (propertyShape.minCount && propertyShape.minCount > 0) {
        result = new (0, _definitionjs.GraphQLNonNull)(result);
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
ShaclParserService = exports.ShaclParserService = _chunkS65R2BUYjs.__decorateClass.call(void 0, [
  _tsyringe.singleton.call(void 0, ),
  _tsyringe.autoInjectable.call(void 0, )
], ShaclParserService);
var ERROR = /* @__PURE__ */ ((ERROR2) => {
  ERROR2["NO_SHACL_SCHEMAS"] = `No shacl schema's`;
  return ERROR2;
})(ERROR || {});


exports.ShaclParserService = ShaclParserService;
