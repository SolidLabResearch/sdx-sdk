import '../src/polyfills';
import { ShaclReaderService } from "../src/parse";

import axios from 'axios';
import { GraphQLSchema } from 'graphql';
import { SHACL_EXAMPLE } from "./assets/examples";

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

mockedAxios.get.mockImplementation(uri => {
  if (uri.endsWith('/index.json')) {
    return Promise.resolve({ data: { entries: ['oneHash'] } });
  } else {
    return Promise.resolve({ data: SHACL_EXAMPLE });
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
        { name: 'property', locations: ['FIELD_DEFINITION', 'INPUT_FIELD_DEFINITION'] },
        { name: 'identifier', locations: ['FIELD_DEFINITION'] }
      ]);
    })

    it('has a Query entrypoint', async () => {
      const schema = await schemaPromise;
      const queryType = schema.getQueryType()!;
      // All QueryFields
      expect(queryType).not.toBeUndefined();
      expect(queryType.name).toBe('Query');
      const fields = queryType.getFields()!;
      expect(Object.keys(fields).length).toBe(6);
      expect(fields).toHaveProperty('address');
      expect(fields).toHaveProperty('addressCollection');
      expect(fields).toHaveProperty('contact');
      expect(fields).toHaveProperty('contactCollection');
      expect(fields).toHaveProperty('organization');
      expect(fields).toHaveProperty('organizationCollection');
      expect(Object.values(fields)).toIncludeAllPartialMembers([
        { name: 'address' },
        { name: 'addressCollection' },
        { name: 'contact' },
        { name: 'contactCollection' },
        { name: 'organization' },
        { name: 'organizationCollection' },
      ]);
    });

    it('has a Mutation entrypoint', async () => {
      const schema = await schemaPromise;
      const mutationType = schema.getMutationType()!;

      expect(mutationType).not.toBeUndefined();
      expect(mutationType.name).toBe('Mutation');
      const fields = mutationType.getFields()!;
      expect(Object.keys(fields).length).toBe(6);
      expect(fields).toHaveProperty('createAddress');
      expect(fields).toHaveProperty('createContact');
      expect(fields).toHaveProperty('createOrganization');
      expect(fields).toHaveProperty('mutateAddress');
      expect(fields).toHaveProperty('mutateContact');
      expect(fields).toHaveProperty('mutateOrganization');
    });
  });
});
