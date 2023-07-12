import { readFileSync } from 'fs';
import gql from 'graphql-tag';
import { SolidLDPBackend, SolidLDPContext, StaticTargetResolver } from '../src';
import { SolidClientCredentials } from '../src/commons';
import { describeIf } from './util/utils';

describe('SolidLDPContext', () => {
  it('can take a string as argument', () => {
    const context = new SolidLDPContext('https://example.com');
    expect(context.resolver).toBeInstanceOf(StaticTargetResolver);
  });

  it('can take a TargetResolver as argument', () => {
    const context = new SolidLDPContext(
      new StaticTargetResolver('https://example.com')
    );
    expect(context.resolver).toBeInstanceOf(StaticTargetResolver);
  });
});

describe('StaticTargetResolver', () => {
  it('always resolves to a set URI', async () => {
    const staticUri = new URL('http://example.com');
    const resolver = new StaticTargetResolver(staticUri.toString());
    expect((await resolver.resolve()).toString()).toEqual(staticUri.toString());
    expect((await resolver.resolve()).toString()).toEqual(staticUri.toString());
  });
});

describeIf('docker')('Auth', () => {
  it('supports client credentials', async () => {
    const schema = readFileSync(
      'test/assets/gql/schema.graphqls',
      'utf-8'
    ).toString();
    // step 1: generate a token linked to webid
    const response = await fetch('http://localhost:3000/idp/credentials/', {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        email: 'test@test.com',
        password: 'test',
        name: 'my-token'
      })
    });
    const { id, secret } = await response.json();

    // step 2: requesting access token
    const clientCredentials: SolidClientCredentials = {
      clientId: id,
      clientSecret: secret,
      identityServerUrl: 'http://localhost:3000'
    };

    const context = new SolidLDPContext(
      'http://localhost:3000/my-pod/contacts.ttl'
    );
    const backend = new SolidLDPBackend({
      clientCredentials,
      defaultContext: context,
      schema
    });

    const result = await backend.requester(
      gql(`query { contactCollection { familyName givenName } }`)
    );
    // console.log(result);
    if (result.errors && result.errors.length > 0) {
      const err = result.errors[0];
      console.log(err?.message);
      console.log(err?.originalError);
    }
    expect(result.errors).toBeUndefined();
    expect((result.data as any).contactCollection).toIncludeAllMembers([
      {
        familyName: 'Kerckhove',
        givenName: 'Wannes'
      },
      {
        familyName: 'Dupont',
        givenName: 'Thomas'
      },
      {
        familyName: 'Demeester',
        givenName: 'Piet'
      }
    ]);
  });
});
