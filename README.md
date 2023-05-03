# Solid Development eXperience (SDX) SDK

This library is meant to facilitate easy development of Solid applications. The library will translate Solid data types (written in SHACL) in to a local GraphQL Schema. 

This enables a couple of features:

* The generated schema can be used by any of your favorite GraphQL IDE plugins.
* You can write your own GraphQL queries with plugin support.
* A fully typed SolidClient will be generated from your queries to use in you application

## Install

```bash
npm install @solidlab/sdx-sdk @solidlab/sdx
```

## Usage
```bash
# !! Demo only right now !!
docker run --name css -p 3000:3000 -d tdupont/css # spin up docker container with demo data
npx sdx demo install contact # installs SHACL from the pod
```

This triggers the following steps:

    * Once the SHACL is downloaded, it is put in the `/src/.sdx-gen/shacl` folder. 
    * The GraphQL schema will be generated and written to `/src/.sdx-gen/graphql/schema.graphqls`.
    * You can write queries and mutations in your `/src/gql` folder.
    * This the queries and schema will be used to generate the `/src/sdx-gen/sdk.generated.ts` file.
    * To create a SolidClient, import this file in your code.

**Queries example**
```graphql
query listContacts {
    contactCollection {
        id
        givenName
        familyName
    }
}

query getContact($id: String!) {
    contact(id: $id) {
        id
        givenName
        familyName
        address {
            streetLine
            postalCode
            city
            country
        }
    }
}

mutation createContact($id: ID, $givenName: String!, $familyName: String!) {
    createContact(input: {id: $id, givenName: $givenName, familyName: $familyName}) {
        id
        givenName
        familyName
    }
}
```

**Code**
```ts
import { SolidLDPBackend, SolidLDPContext } from '@solidlab/sdx-sdk';
import { Contact, getSolidClient, Sdk } from 'src/.sdx-gen/sdk.generated';

// Create a backend that statically resolves to one (Pod) URI.
const defaultContext = new SolidLDPContext('http://localhost:3000/complex.ttl'); 
const backend = new SolidLDPBackend({ defaultContext });
// Create the client with fully types support
const client = getSolidClient(backend.requester);

// Use the client to read
const contacts = (await client.listContacts()).data;
contacts.forEach({givenName, familyName} => console.log(`${givenName} ${familyName}`));

const contact = (await client.getContact('http://example.org/cont/tdupont')).data;
console.log(`${contact.givenName} ${contact.familyName}`);

// Use the client to write
await client.createContact({
    id: 'http://example.org/cont/jdoe',
    givenName: 'John',
    familyName: 'Doe'
});
```

## Notes

### ExecutionEnvelope

For now results of the generated SolidClient API are wrapped in an ExecutionResult envelope containing an `error` and a `data` key. There is however an option to bypass the ExecutionResult envelope and either return the `data` contents directly or the `error` content directly (if an error occurred).

### Container vs Document

There is preliminary support for two storage approaches:

* **Document** All data is stored in one document.
* **Container** A parent contains an index to the children documents, in which the child data is stored.
