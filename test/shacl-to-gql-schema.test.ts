import '../src/polyfills';

import axios from 'axios';
import { readFile } from 'fs/promises';
import {
  GraphQLField,
  GraphQLID,
  GraphQLList,
  GraphQLNamedOutputType,
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

    it('has Mutation Types', async () => {
      const schema = await schemaPromise;
      const types = Object.values(schema.getTypeMap()).filter(
        (type) =>
          type instanceof GraphQLObjectType &&
          !type.name.startsWith('__') &&
          type.name !== 'Query' &&
          type.name !== 'Mutation' &&
          type.name.endsWith('Mutation')
      );

      const checkMutationType = (type: GraphQLObjectType) => {
        const fields = Object.values(type.getFields());
        // All fields should start with a lower case letter
        expect(fields).toSatisfyAll(
          (field: GraphQLField<any, any>) =>
            field.name.slice(0, 1).toLocaleLowerCase() ===
            field.name.slice(0, 1)
        );
        const typeName = type.name.slice(0, -'Mutation'.length);
        const queryType = schema.getType(typeName)!;
        // There should at least be a delete field
        expect(fields.length).toBeGreaterThanOrEqual(1);
        expect(fields).toIncludeAllPartialMembers([
          {
            name: 'delete',
            type: new GraphQLNonNull(queryType),
            extensions: {}
          }
        ]);

        // Check update field, if present
        const updateField = type.getFields().update;
        if (updateField) {
          // Should return nonnull of query type
          expect(updateField.type).toEqual(new GraphQLNonNull(queryType));
          expect(updateField.args).toIncludeAllPartialMembers([
            {
              name: 'input',
              type: new GraphQLNonNull(
                schema.getType(`Update${typeName}Input`)!
              ),
              extensions: {}
            }
          ]);
          expect(updateField.extensions).toEqual({});
        }

        // TODO: Check link fields
        const linkFields = Object.entries(type.getFields())
          .filter((entry) => entry[0].startsWith('link'))
          .map((entry) => entry[1]);
        if (linkFields.length > 0) {
          linkFields.forEach((field) => {
            // Should return nonnull of query type
            expect(field.type).toEqual(new GraphQLNonNull(queryType));
            expect(field.args).toIncludeAllPartialMembers([
              {
                name: 'id',
                type: new GraphQLNonNull(GraphQLID),
                extensions: {}
              }
            ]);
            expect(field.extensions).toEqual({});
          });
        }

        // TODO: Check unlink fields
        const unlinkFields = Object.entries(type.getFields())
          .filter((entry) => entry[0].startsWith('unlink'))
          .map((entry) => entry[1]);
        if (unlinkFields.length > 0) {
          unlinkFields.forEach((field) => {
            // Should return nonnull of query type
            expect(field.type).toEqual(new GraphQLNonNull(queryType));
            expect(field.args).toIncludeAllPartialMembers([
              {
                name: 'id',
                type: new GraphQLNonNull(GraphQLID),
                extensions: {}
              }
            ]);
            expect(field.extensions).toEqual({});
          });
        }

        // TODO: Check set fields
        const setFields = Object.entries(type.getFields())
          .filter((entry) => entry[0].startsWith('set'))
          .map((entry) => entry[1]);
        if (setFields.length > 0) {
          setFields.forEach((field) => {
            // Read the return type of the field of the queryType, derived from the fieldName of this field
            const derivedName = decapitalize(field.name.slice('set'.length));
            const argTypeName = (queryType as GraphQLObjectType)
              .getFields()
              [derivedName]!.type.toString();
            // Should return nonnull of query type
            expect(field.type).toEqual(new GraphQLNonNull(queryType));
            expect(field.args).toIncludeAllPartialMembers([
              {
                name: 'input',
                type: new GraphQLNonNull(
                  schema.getType(`Create${argTypeName}Input`)!
                ),
                extensions: {}
              }
            ]);
            expect(field.extensions).toEqual({});
          });
        }

        // TODO: Check clear fields
        const clearFields = Object.entries(type.getFields())
          .filter((entry) => entry[0].startsWith('clear'))
          .map((entry) => entry[1]);
        if (clearFields.length > 0) {
          clearFields.forEach((field) => {
            // Should return nonnull of query type
            expect(field.type).toEqual(new GraphQLNonNull(queryType));
            expect(field.args).toEqual([]);
            expect(field.extensions).toEqual({});
          });
        }

        // TODO: Check add fields
        const addFields = Object.entries(type.getFields())
          .filter((entry) => entry[0].startsWith('add'))
          .map((entry) => entry[1]);
        if (addFields.length > 0) {
          addFields.forEach((field) => {
            // Read the return type of the field of the queryType, derived from the fieldName of this field
            const derivedName = decapitalize(field.name.slice('set'.length));
            const argTypeName = (
              (queryType as GraphQLObjectType).getFields()[derivedName]!
                .type! as GraphQLList<any>
            ).ofType.toString();
            // Should return nonnull of query type
            expect(field.type).toEqual(new GraphQLNonNull(queryType));
            expect(field.args).toIncludeAllPartialMembers([
              {
                name: 'input',
                type: new GraphQLNonNull(
                  schema.getType(`Create${argTypeName}Input`)!
                ),
                extensions: {}
              }
            ]);
            expect(field.extensions).toEqual({});
          });
        }

        // TODO: check remove Fields
        const removeFields = Object.entries(type.getFields())
          .filter((entry) => entry[0].startsWith('remove'))
          .map((entry) => entry[1]);
        if (removeFields.length > 0) {
          removeFields.forEach((field) => {
            // Should return nonnull of query type
            expect(field.type).toEqual(new GraphQLNonNull(queryType));
            expect(field.args).toIncludeAllPartialMembers([
              {
                name: 'id',
                type: new GraphQLNonNull(GraphQLID),
                extensions: {}
              }
            ]);
            expect(field.extensions).toEqual({});
          });
        }
      };

      // Check mutation types
      types.map((type) => type as GraphQLObjectType).forEach(checkMutationType);
    });
  });
});
