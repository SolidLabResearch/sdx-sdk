import axios from 'axios';
import {
  DirectiveLocation,
  GraphQLDirective,
  GraphQLField,
  GraphQLFieldConfig,
  GraphQLID,
  GraphQLInputField,
  GraphQLInputFieldConfig,
  GraphQLInputObjectType,
  GraphQLInputType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLObjectTypeConfig,
  GraphQLOutputType,
  GraphQLSchema,
  GraphQLString,
  GraphQLType,
  isListType,
  isNonNullType,
  specifiedScalarTypes,
  ThunkObjMap
} from 'graphql';
import { Parser, Quad } from 'n3';
import { autoInjectable, singleton } from 'tsyringe';
import { utils } from '../commons';
import { Context } from './context';
import { PropertyShape, Shape } from './model';

// const { namedNode } = DataFactory;

const ID_FIELD: { id: GraphQLFieldConfig<any, any> } = {
  id: {
    description:
      'Auto-generated property that will be assigned to the `iri` of the Thing that is being queried.',
    type: new GraphQLNonNull(GraphQLID),
    extensions: {
      directives: {
        identifier: {}
      }
    }
  }
} as const;

const ID_MUTATOR_FIELD: { id: GraphQLInputFieldConfig } = {
  id: {
    description: `Optional URI to use as an identifier for the new instance. One of the 'id' or 'slug' fields must be set!`,
    type: GraphQLID
  }
} as const;

const SLUG_MUTATOR_FIELD: { slug: GraphQLInputFieldConfig } = {
  slug: {
    description: `Optional slug that is combined with the context of the request to generate an identifier for the new instance. One of the 'id' or 'slug' fields must be set!`,
    type: GraphQLString
  }
} as const;

const IDENTIFIER_DIRECTIVE = new GraphQLDirective({
  name: 'identifier',
  locations: [DirectiveLocation.FIELD_DEFINITION]
});

const IS_DIRECTIVE = new GraphQLDirective({
  name: 'is',
  args: { class: { type: GraphQLString } },
  locations: [DirectiveLocation.OBJECT, DirectiveLocation.INPUT_OBJECT]
});

const PROPERTY_DIRECTIVE = new GraphQLDirective({
  name: 'property',
  args: { iri: { type: GraphQLString } },
  locations: [
    DirectiveLocation.FIELD_DEFINITION,
    DirectiveLocation.INPUT_FIELD_DEFINITION
  ]
});

const ROOT_QUERY_TYPE = 'Query';
const ROOT_MUTATION_TYPE = 'Mutation';

@singleton()
@autoInjectable()
export class ShaclReaderService {
  private parser: Parser;
  private _cache: Quad[] = [];
  primed = false;

  constructor() {
    this.parser = new Parser({ format: 'turtle' });
  }

  async primeCache(uri: string) {
    const response = await axios.get<{ entries: string[] }>(
      uri + '/index.json'
    );
    this._cache = [];
    for (const entry of response.data.entries) {
      const txt = await axios.get(uri + '/' + entry);
      this._cache.push(...this.parser.parse(txt.data));
    }
    this.primed = true;
  }

  async parseSHACLs(uri: string): Promise<GraphQLSchema> {
    if (!this.primed) {
      console.time('Prime schema cache');
      await this.primeCache(uri);
      console.timeEnd('Prime schema cache');
    }
    console.time('Parse SHACL to schema');
    const context = new Context(this._cache, this.generateObjectType);

    // Generate Schema
    const schema = new GraphQLSchema({
      query: this.generateEntryPoints(context.getGraphQLObjectTypes()),
      mutation: this.generateMutationEntryPoints(context),
      directives: [IS_DIRECTIVE, PROPERTY_DIRECTIVE, IDENTIFIER_DIRECTIVE]
    });
    console.timeEnd('Parse SHACL to schema');
    return schema;
  }

  /**
   * Generates the entry points for the GraphQL Query schema
   * @param types
   * @returns
   */
  private generateEntryPoints(types: GraphQLObjectType[]): GraphQLObjectType {
    const query = new GraphQLObjectType({
      name: ROOT_QUERY_TYPE,
      fields: types.reduce(
        (prev, type) => ({
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
        }),
        {}
      )
    } as GraphQLObjectTypeConfig<any, any>);

    return query;
  }

  /**
   * Generates a Mutation EntryPoint RootMutationType
   * @param types
   * @returns
   */
  private generateMutationEntryPoints(context: Context): GraphQLObjectType {
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
            args: {
              input: {
                type: new GraphQLNonNull(
                  this.generateInputObjectType(
                    type,
                    `${utils.capitalize(createName)}Input`,
                    'create',
                    context
                  )
                )
              }
            }
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
  private generateInputObjectType(
    type: GraphQLObjectType,
    name: string,
    mutationType: 'create' | 'update',
    context: Context
  ): GraphQLInputObjectType {
    let inputType = context.getInputTypes().find((type) => name === type.name);
    if (!inputType) {
      let fields = Object.fromEntries(
        Object.entries(type.getFields())
          .filter(([, field]) => utils.isOrContainsScalar(field.type))
          .filter(([, field]) => !isIdentifier(field))
          .map(([name, field]) => [name, toInputField(field, mutationType)])
      );
      if (mutationType === 'create') {
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
      }) as GraphQLInputObjectType;
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
  private generateMutationObjectType(
    type: GraphQLObjectType,
    context: Context
  ): GraphQLObjectType {
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
  private generateMutationObjectTypeFields(
    type: GraphQLObjectType,
    context: Context
  ): ThunkObjMap<GraphQLFieldConfig<any, any>> {
    // Delete operation is always present
    const fields: ThunkObjMap<GraphQLFieldConfig<any, any>> = {
      delete: { type: new GraphQLNonNull(type) }
    };

    // Update operation if InputObject contains at least 1 scalar field.
    const inputType = this.generateInputObjectType(
      type,
      `Update${utils.capitalize(type.name)}Input`,
      'update',
      context
    );
    if (Object.keys(inputType.getFields()).length > 0) {
      fields.update = {
        type: new GraphQLNonNull(type),
        args: { input: { type: new GraphQLNonNull(inputType) } }
      };
    }

    // Add operations for other non-scalar fields
    const extra = Object.values(type.getFields()).reduce((acc, field) => {
      if (utils.isOrContainsObjectType(field.type)) {
        const isListLike =
          isListType(field.type) ||
          (isNonNullType(field.type) && isListType(field.type.ofType));
        acc = {
          ...acc,
          ...(isListLike
            ? this.generateMutationObjectTypeFieldsForCollection(
                field,
                type,
                context
              ) // arrayLike
            : this.generateMutationObjectTypeFieldsForSingular(
                field,
                type,
                context
              )) // singular
        };
      }
      return acc;
    }, {} as ThunkObjMap<GraphQLFieldConfig<any, any>>);
    return { ...fields, ...extra };
  }

  /**
   * Generate fields for a MutationObjectType when the field of the original has a collection return type
   * @param field Original field
   * @param parentType Original Object Type
   * @param context
   * @returns
   */
  private generateMutationObjectTypeFieldsForCollection(
    field: GraphQLField<any, any>,
    parentType: GraphQLOutputType,
    context: Context
  ): ThunkObjMap<GraphQLFieldConfig<any, any>> {
    const addName = `add${utils.capitalize(field.name)}`;
    const removeName = `remove${utils.capitalize(field.name)}`;
    const linkName = `link${utils.capitalize(field.name)}`;
    const unlinkName = `unlink${utils.capitalize(field.name)}`;
    const returnType = new GraphQLNonNull(parentType);
    const fieldType = utils.toActualType(field.type) as GraphQLObjectType;
    return {
      [addName]: {
        type: returnType,
        args: {
          input: {
            type: new GraphQLNonNull(
              this.generateInputObjectType(
                fieldType,
                `Create${utils.capitalize(fieldType.name)}Input`,
                'create',
                context
              )
            )
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
  private generateMutationObjectTypeFieldsForSingular(
    field: GraphQLField<any, any>,
    parentType: GraphQLOutputType,
    context: Context
  ): ThunkObjMap<GraphQLFieldConfig<any, any>> {
    const setName = `set${utils.capitalize(field.name)}`;
    const clearName = `clear${utils.capitalize(field.name)}`;
    const linkName = `link${utils.capitalize(field.name)}`;
    const unlinkName = `unlink${utils.capitalize(field.name)}`;
    const returnType = new GraphQLNonNull(parentType);
    const fieldType = utils.toActualType(field.type) as GraphQLObjectType;
    return {
      [setName]: {
        type: returnType,
        args: {
          input: {
            type: new GraphQLNonNull(
              this.generateInputObjectType(
                fieldType,
                `Create${utils.capitalize(fieldType.name)}Input`,
                'create',
                context
              )
            )
          }
        }
      },
      [clearName]: {
        type: returnType
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
   * Generates a GraphQLObjectType from a Shape
   * @param shape
   * @returns
   */
  private generateObjectType(shape: Shape): GraphQLObjectType {
    const applyMinMaxCount = (
      propertyShape: PropertyShape,
      type: GraphQLType
    ): GraphQLList<GraphQLType> | GraphQLNonNull<GraphQLType> | GraphQLType => {
      let result:
        | GraphQLList<GraphQLType>
        | GraphQLNonNull<GraphQLType>
        | GraphQLType = type;
      // collection
      if (
        !propertyShape.maxCount ||
        (propertyShape.maxCount && propertyShape.maxCount > 1)
      ) {
        result = new GraphQLList(result);
      }
      if (propertyShape.minCount && propertyShape.minCount > 0) {
        result = new GraphQLNonNull(result);
      }
      return result;
    };
    const props = () =>
      shape.propertyShapes.reduce(
        (
          prev: { [key: string]: GraphQLFieldConfig<any, any> },
          prop: PropertyShape
        ) => {
          const propType = prop.type ?? prop.class();
          if (!propType) {
            return prev;
          } else {
            return {
              ...prev,
              [prop.name]: {
                type: applyMinMaxCount(prop, propType!),
                description: prop.description,
                extensions: {
                  directives: {
                    property: { iri: prop.path }
                  }
                }
              } as GraphQLFieldConfig<any, any>
            };
          }
        },
        ID_FIELD
      );
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
}

function toInputField(
  field: GraphQLField<any, any>,
  mutationType: 'create' | 'update'
): GraphQLInputFieldConfig {
  let fieldType = toScalarInputType(field.type);
  // If mutationType is 'update', make the field nullable
  fieldType =
    mutationType === 'update' && isNonNullType(fieldType)
      ? fieldType.ofType
      : fieldType;
  return {
    type: fieldType,
    description: field.description,
    extensions: field.extensions
  };
}

function toScalarInputType(
  type: GraphQLOutputType,
  modifiers: { collection?: boolean; nonNull?: boolean } = {}
): GraphQLInputType {
  if (isListType(type)) {
    let res = toScalarInputType(type.ofType, { collection: true });
    if (modifiers.collection) {
      res = new GraphQLList(res);
    }
    if (modifiers.nonNull) {
      res = new GraphQLNonNull(res);
    }
    return res;
  }
  if (isNonNullType(type)) {
    let res = toScalarInputType(type.ofType, { nonNull: true });
    if (modifiers.collection) {
      res = new GraphQLList(res);
    }
    if (modifiers.nonNull) {
      res = new GraphQLNonNull(res);
    }
    return res;
  }
  let res: GraphQLInputType = specifiedScalarTypes.find(
    (t) => t.name === type.toString()
  )!;
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

/**
 * Whether this field is annotated with the @identifier directive
 * @param field
 * @returns
 */
function isIdentifier(field: GraphQLField<any, any> | GraphQLInputField) {
  const directives = field.extensions.directives as any;
  return directives && directives['identifier'];
}
