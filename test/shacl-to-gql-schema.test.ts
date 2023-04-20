import '../src/polyfills';

import axios from 'axios';
import { readFile } from 'fs/promises';
import {
  GraphQLField,
  GraphQLID,
  GraphQLList,
  GraphQLNamedOutputType,
  GraphQLNamedType,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLSchema,
  GraphQLString
} from 'graphql';
import { capitalize, decapitalize } from '../src/commons/util';
import { ShaclReaderService } from '../src/parse';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

mockedAxios.get.mockImplementation(async (uri) => {
  if (uri.endsWith('/index.json')) {
    return { data: { entries: ['oneHash'] } };
  } else {
    const shacl = await readFile('test/assets/shacl/contacts_shacl.ttl');
    return { data: shacl.toString() };
  }
});

describe('A SchaclReaderService', () => {
  const reader = new ShaclReaderService();
  const schemaPromise = reader.parseSHACLs('http://example.com/shacl/');

  it('parses SHACL to GQL Schema', async () => {
    const schema = await schemaPromise;
    expect(schema).not.toBeUndefined();
    expect(schema).toBeInstanceOf(GraphQLSchema);
  });

  describe('A generated GQL Schema', () => {
    it('has directives', async () => {
      const schema = await schemaPromise;
      const directives = schema.getDirectives();

      // All directives
      expect(directives).not.toBeUndefined();
      expect(directives.length).toBe(3);
      expect(directives).toIncludeAllPartialMembers([
        { name: 'is', locations: ['OBJECT', 'INPUT_OBJECT'] },
        {
          name: 'property',
          locations: ['FIELD_DEFINITION', 'INPUT_FIELD_DEFINITION']
        },
        { name: 'identifier', locations: ['FIELD_DEFINITION'] }
      ]);
    });

    it('has a Query entrypoint', async () => {
      const schema = await schemaPromise;
      const queryType = schema.getQueryType()!;
      const fieldMatcher = (field: GraphQLField<any, any>): boolean => {
        const name = field.name;
        const isCollection = name.endsWith('Collection');
        const typeName = capitalize(
          isCollection ? name.slice(0, -'Collection'.length) : name
        );

        if (isCollection) {
          return (field.type as GraphQLList<any>).ofType.name === typeName;
        } else {
          const fieldType = field.type as GraphQLNamedOutputType;
          return (
            fieldType.name === typeName &&
            field.args.length === 1 &&
            field.args[0]!.name === 'id' &&
            field.args[0]!.type === GraphQLString
          );
        }
      };
      // All QueryFields
      expect(queryType).not.toBeUndefined();
      expect(queryType.name).toBe('Query');
      const fields = queryType.getFields()!;
      expect(Object.keys(fields).length).toBe(6);
      expect(Object.values(fields)).toIncludeAllPartialMembers([
        { name: 'address' },
        { name: 'addressCollection' },
        { name: 'contact' },
        { name: 'contactCollection' },
        { name: 'organization' },
        { name: 'organizationCollection' }
      ]);
      expect(Object.values(fields)).toSatisfyAll(fieldMatcher);
    });

    it('has a Mutation entrypoint', async () => {
      const schema = await schemaPromise;
      const mutationType = schema.getMutationType()!;
      const fieldMatcher = (field: GraphQLField<any, any>): boolean => {
        const name = field.name;
        const isCreate = name.startsWith('create');
        const typeName = capitalize(
          isCreate ? name.slice('create'.length) : name.slice('mutate'.length)
        );

        // createXxx
        if (isCreate) {
          return (
            (field.type as GraphQLNonNull<any>).ofType.name === typeName &&
            field.args.length === 1 &&
            field.args[0]!.name === 'input' &&
            (field.args[0]!.type as GraphQLNonNull<any>).ofType.name ===
              `Create${typeName}Input`
          );
        }
        // mutateXxx
        else {
          const fieldType = field.type as GraphQLNamedOutputType;
          return (
            fieldType.name === `${typeName}Mutation` &&
            field.args.length === 1 &&
            field.args[0]!.name === 'id' &&
            field.args[0]!.type.toString() === 'ID!'
          );
        }
      };

      expect(mutationType).not.toBeUndefined();
      expect(mutationType.name).toBe('Mutation');
      const fields = mutationType.getFields()!;
      expect(Object.keys(fields).length).toBe(6);
      expect(Object.values(fields)).toIncludeAllPartialMembers([
        { name: 'createAddress' },
        { name: 'createContact' },
        { name: 'createOrganization' },
        { name: 'mutateAddress' },
        { name: 'mutateContact' },
        { name: 'mutateOrganization' }
      ]);
      expect(Object.values(fields)).toSatisfyAll(fieldMatcher);
    });

    it('has Query Types', async () => {
      const schema = await schemaPromise;
      const types = Object.values(schema.getTypeMap()).filter(
        (type) =>
          type instanceof GraphQLObjectType &&
          !type.name.startsWith('__') &&
          type.name !== 'Query' &&
          type.name !== 'Mutation' &&
          !type.name.endsWith('Mutation')
      );

      const checkQueryType = (type: GraphQLObjectType) => {
        const fields = Object.values(type.getFields());
        // There should at least be an id field with a @identifier directive
        expect(fields.length).toBeGreaterThanOrEqual(1);
        expect(fields).toIncludeAllPartialMembers([
          {
            name: 'id',
            type: new GraphQLNonNull(GraphQLID),
            extensions: { directives: { identifier: {} } }
          }
        ]);
        expect(fields.filter((fields) => fields.name !== 'id')).toSatisfyAll(
          (field: GraphQLField<any, any>) => {
            const extensions = field.extensions as Record<string, any>;
            return (
              // Check if field is of a supported type
              (field.type instanceof GraphQLNonNull ||
                field.type instanceof GraphQLList ||
                field.type instanceof GraphQLObjectType ||
                field.type instanceof GraphQLScalarType) &&
              // Fields should not start with a capital letter
              field.name.slice(0, 1).toLocaleLowerCase() ===
                field.name.slice(0, 1) &&
              // Fields should have a @property directive with an iri key
              'directives' in field.extensions &&
              'property' in extensions.directives &&
              'iri' in extensions.directives.property &&
              extensions.directives.property.iri.startsWith(
                'http://schema.org/'
              )
            );
          }
        );
      };

      // Check query types
      types.map((type) => type as GraphQLObjectType).forEach(checkQueryType);
    });

    // describe('has Mutation Types', async () => {
    //   const schema = await schemaPromise;
    //   const types = Object.values(schema.getTypeMap()).filter(
    //     (type) =>
    //       type instanceof GraphQLObjectType &&
    //       !type.name.startsWith('__') &&
    //       type.name !== 'Query' &&
    //       type.name !== 'Mutation' &&
    //       type.name.endsWith('Mutation')
    //   );

    //   const getFieldsByPrefix = (type: GraphQLNamedType, prefix: string) => {
    //     return Object.entries((type as GraphQLObjectType).getFields())
    //       .filter((entry) => entry[0].startsWith(prefix))
    //       .map((entry) => entry[1]);
    //   };

    //   const checkMutationType = (type: GraphQLObjectType) => {
    //     // All fields should start with a lower case letter
    //     const fields = Object.values(type.getFields());
    //     expect(fields).toSatisfyAll(
    //       (field: GraphQLField<any, any>) =>
    //         field.name.slice(0, 1).toLocaleLowerCase() ===
    //         field.name.slice(0, 1)
    //     );
    //   };

    //   it('with all minimal required fields', () => {
    //     // Check mutation types
    //     types.forEach((type) => checkMutationType(type as GraphQLObjectType));
    //   });

    //   it('with a correct delete field', async () => {
    //     types.forEach((type) => {
    //       const fields = Object.values((type as GraphQLObjectType).getFields());
    //       const typeName = type.name.slice(0, -'Mutation'.length);
    //       const queryType = schema.getType(typeName)!;
    //       // There should at least be a delete field
    //       expect(fields.length).toBeGreaterThanOrEqual(1);
    //       expect(fields).toIncludeAllPartialMembers([
    //         {
    //           name: 'delete',
    //           type: new GraphQLNonNull(queryType),
    //           extensions: {}
    //         }
    //       ]);
    //     });
    //   });

    //   it('with a correct update field', async () => {
    //     types.forEach((type) => {
    //       const typeName = type.name.slice(0, -'Mutation'.length);
    //       const queryType = schema.getType(typeName)!;
    //       const updateField = (type as GraphQLObjectType).getFields().update;
    //       // Check update field, if present
    //       if (updateField) {
    //         // Should return nonnull of query type
    //         expect(updateField.type).toEqual(new GraphQLNonNull(queryType));
    //         expect(updateField.args).toIncludeAllPartialMembers([
    //           {
    //             name: 'input',
    //             type: new GraphQLNonNull(
    //               schema.getType(`Update${typeName}Input`)!
    //             ),
    //             extensions: {}
    //           }
    //         ]);
    //         expect(updateField.extensions).toEqual({});
    //       }
    //     });
    //   });

    //   it('with correct link fields', async () => {
    //     // Check link fields
    //     types.forEach((type) => {
    //       const typeName = type.name.slice(0, -'Mutation'.length);
    //       const queryType = schema.getType(typeName)!;
    //       const linkFields = getFieldsByPrefix(type, 'link');
    //       if (linkFields.length > 0) {
    //         linkFields.forEach((field) => {
    //           // Should return nonnull of query type
    //           expect(field.type).toEqual(new GraphQLNonNull(queryType));
    //           expect(field.args).toIncludeAllPartialMembers([
    //             {
    //               name: 'id',
    //               type: new GraphQLNonNull(GraphQLID),
    //               extensions: {}
    //             }
    //           ]);
    //           expect(field.extensions).toEqual({});
    //         });
    //       }
    //     });
    //   });

    //   it('with correct unlink fields', async () => {
    //     // Check unlink fields
    //     types.forEach((type) => {
    //       const typeName = type.name.slice(0, -'Mutation'.length);
    //       const queryType = schema.getType(typeName)!;
    //       const unlinkFields = getFieldsByPrefix(type, 'unlink');
    //       if (unlinkFields.length > 0) {
    //         unlinkFields.forEach((field) => {
    //           // Should return nonnull of query type
    //           expect(field.type).toEqual(new GraphQLNonNull(queryType));
    //           expect(field.args).toIncludeAllPartialMembers([
    //             {
    //               name: 'id',
    //               type: new GraphQLNonNull(GraphQLID),
    //               extensions: {}
    //             }
    //           ]);
    //           expect(field.extensions).toEqual({});
    //         });
    //       }
    //     });
    //   });

    //   it('with correct set fields', async () => {
    //     // Check set fields
    //     types.forEach((type) => {
    //       const typeName = type.name.slice(0, -'Mutation'.length);
    //       const queryType = schema.getType(typeName)!;
    //       const setFields = getFieldsByPrefix(type, 'set');
    //       if (setFields.length > 0) {
    //         setFields.forEach((field) => {
    //           // Read the return type of the field of the queryType, derived from the fieldName of this field
    //           const derivedName = decapitalize(field.name.slice('set'.length));
    //           const argTypeName = (queryType as GraphQLObjectType)
    //             .getFields()
    //             [derivedName]!.type.toString();
    //           // Should return nonnull of query type
    //           expect(field.type).toEqual(new GraphQLNonNull(queryType));
    //           expect(field.args).toIncludeAllPartialMembers([
    //             {
    //               name: 'input',
    //               type: new GraphQLNonNull(
    //                 schema.getType(`Create${argTypeName}Input`)!
    //               ),
    //               extensions: {}
    //             }
    //           ]);
    //           expect(field.extensions).toEqual({});
    //         });
    //       }
    //     });
    //   });

    //   it('with correct clear fields', async () => {
    //     // Check clear fields
    //     types.forEach((type) => {
    //       const typeName = type.name.slice(0, -'Mutation'.length);
    //       const queryType = schema.getType(typeName)!;
    //       const clearFields = getFieldsByPrefix(type, 'clear');
    //       if (clearFields.length > 0) {
    //         clearFields.forEach((field) => {
    //           // Should return nonnull of query type
    //           expect(field.type).toEqual(new GraphQLNonNull(queryType));
    //           expect(field.args).toEqual([]);
    //           expect(field.extensions).toEqual({});
    //         });
    //       }
    //     });
    //   });

    //   it('with correct add fields', async () => {
    //     // Check add fields
    //     types.forEach((type) => {
    //       const typeName = type.name.slice(0, -'Mutation'.length);
    //       const queryType = schema.getType(typeName)!;
    //       const addFields = getFieldsByPrefix(type, 'add');
    //       if (addFields.length > 0) {
    //         addFields.forEach((field) => {
    //           // Read the return type of the field of the queryType, derived from the fieldName of this field
    //           const derivedName = decapitalize(field.name.slice('set'.length));
    //           const argTypeName = (
    //             (queryType as GraphQLObjectType).getFields()[derivedName]!
    //               .type! as GraphQLList<any>
    //           ).ofType.toString();
    //           // Should return nonnull of query type
    //           expect(field.type).toEqual(new GraphQLNonNull(queryType));
    //           expect(field.args).toIncludeAllPartialMembers([
    //             {
    //               name: 'input',
    //               type: new GraphQLNonNull(
    //                 schema.getType(`Create${argTypeName}Input`)!
    //               ),
    //               extensions: {}
    //             }
    //           ]);
    //           expect(field.extensions).toEqual({});
    //         });
    //       }
    //     });
    //   });

    //   it('with correct remove fields', async () => {
    //     // check remove Fields
    //     types.forEach((type) => {
    //       const typeName = type.name.slice(0, -'Mutation'.length);
    //       const queryType = schema.getType(typeName)!;
    //       const removeFields = getFieldsByPrefix(type, 'remove');
    //       if (removeFields.length > 0) {
    //         removeFields.forEach((field) => {
    //           // Should return nonnull of query type
    //           expect(field.type).toEqual(new GraphQLNonNull(queryType));
    //           expect(field.args).toIncludeAllPartialMembers([
    //             {
    //               name: 'id',
    //               type: new GraphQLNonNull(GraphQLID),
    //               extensions: {}
    //             }
    //           ]);
    //           expect(field.extensions).toEqual({});
    //         });
    //       }
    //     });
    //   });

    //   it('with correctly paired link fields', async () => {
    //     types.forEach((type) => {
    //       const typeName = type.name.slice(0, -'Mutation'.length);
    //       const addFields = getFieldsByPrefix(type, 'add');
    //       const removeFields = getFieldsByPrefix(type, 'remove');
    //       const setFields = getFieldsByPrefix(type, 'set');
    //       const clearFields = getFieldsByPrefix(type, 'clear');
    //       const linkFields = getFieldsByPrefix(type, 'link');
    //       const unlinkFields = getFieldsByPrefix(type, 'unlink');

    //       const checkIfFieldsAreLinkPaired = (
    //         pair: [GraphQLField<any, any>[], GraphQLField<any, any>[]],
    //         prefixes: [string, string]
    //       ) => {
    //         const [fields1, fields2] = pair;
    //         const [prefix1, prefix2] = prefixes;
    //         // First check
    //         if (fields1.length > 0) {
    //           fields1.forEach((field) => {
    //             const subName = field.name.slice(prefix1.length);
    //             expect(fields2).toIncludeAllPartialMembers([
    //               { name: `${prefix2}${subName}` }
    //             ]);
    //             expect(linkFields).toIncludeAllPartialMembers([
    //               { name: `link${subName}` }
    //             ]);
    //             expect(unlinkFields).toIncludeAllPartialMembers([
    //               { name: `unlink${subName}` }
    //             ]);
    //           });
    //         }
    //         // Opposite check
    //         if (fields2.length > 0) {
    //           fields2.forEach((field) => {
    //             const subName = field.name.slice(prefix2.length);
    //             expect(fields1).toIncludeAllPartialMembers([
    //               { name: `${prefix1}${subName}` }
    //             ]);
    //             expect(linkFields).toIncludeAllPartialMembers([
    //               { name: `link${subName}` }
    //             ]);
    //             expect(unlinkFields).toIncludeAllPartialMembers([
    //               { name: `unlink${subName}` }
    //             ]);
    //           });
    //         }
    //       };

    //       // Add/remove fields and set/clear fields should come paired with link/unlink fields;
    //       checkIfFieldsAreLinkPaired(
    //         [addFields, removeFields],
    //         ['add', 'remove']
    //       );
    //       checkIfFieldsAreLinkPaired(
    //         [setFields, clearFields],
    //         ['set', 'clear']
    //       );
    //     });
    //   });
    // });
  });
});
