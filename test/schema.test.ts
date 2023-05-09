import '../src/polyfills';

import { makeExecutableSchema } from '@graphql-tools/schema';
import { readFile } from 'fs/promises';
import { GraphQLObjectType } from 'graphql';
import { getDirectivesMap } from '../src/commons/util';

describe('A GQL Schema can be read', () => {
  it('with proper directives', async () => {
    const schemaFile = await readFile('.\\test\\assets\\gql\\schema.graphqls');
    const typeDefs = schemaFile.toString();
    const schema = await makeExecutableSchema({ typeDefs });

    const type = schema.getType('Address')!;
    const field = (type as GraphQLObjectType).getFields()['city']!;
    const id = (type as GraphQLObjectType).getFields()['id']!;

    const addressDirectives = getDirectivesMap(type);
    const fieldDirectives = getDirectivesMap(field);
    const idDirectives = getDirectivesMap(id);
    expect(schema).toBeDefined();
    expect(addressDirectives).toEqual({
      is: {
        class: 'http://schema.org/PostalAddress'
      }
    });
    expect(fieldDirectives).toEqual({
      property: {
        iri: 'http://schema.org/addressLocality'
      }
    });
    expect(idDirectives).toEqual({
      identifier: {}
    });
  });
});
