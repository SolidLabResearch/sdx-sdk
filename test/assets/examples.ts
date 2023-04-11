export const SHACL_EXAMPLE = `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix schema: <http://schema.org/> .
@prefix ex: <http://example.org/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

ex:Contact
    a rdfs:Class, sh:NodeShape ;
    sh:targetClass schema:Person;
    sh:property
            [
          sh:path schema:givenName ;
          sh:datatype xsd:string ;
          sh:minCount 1 ;
          sh:maxCount 1 ;
      ],
            [
          sh:path schema:familyName ;
          sh:datatype xsd:string ;
          sh:minCount 1 ;
          sh:maxCount 1;
      ],
            [
          sh:path schema:email;
          sh:datatype xsd:string ;
      ],
            [
          sh:path schema:address ;
          sh:class schema:PostalAddress ;
          sh:maxCount 1;
      ],
            [
          sh:path schema:worksFor ;
          sh:class schema:Organization ;
      ].

ex:Address
    a rdfs:Class , sh:NodeShape ;
    sh:targetClass schema:PostalAddress ;
    sh:property [
          sh:name "country" ;
          sh:path schema:addressCountry ;
          sh:datatype xsd:string ;
          sh:minCount 1;
          sh:maxCount 1;
      ],
    [
          sh:name "city" ;
          sh:path schema:addressLocality ;
          sh:datatype xsd:string ;
          sh:minCount 1;
          sh:maxCount 1;
      ],
    [
          sh:name "streetLine" ;
          sh:path schema:streetAddress ;
          sh:datatype xsd:string ;
          sh:minCount 1;
          sh:maxCount 1;
      ],
    [
          sh:name "postalCode" ;
          sh:path schema:postalCode ;
          sh:datatype xsd:string ;
          sh:minCount 1;
          sh:maxCount 1;
      ].

ex:Organization
    a rdfs:Class , sh:NodeShape ;
    sh:targetClass schema:Organization  ;
    sh:property [
          sh:path schema:name  ;
          sh:datatype xsd:string ;
          sh:minCount 1;
          sh:maxCount 1;
      ],
                [
                    sh:path schema:address ;
                    sh:class schema:PostalAddress ;
                    sh:maxCount 1;
                ].`;

const GQL_SCHEMA = `
schema {
    query: Query
    mutation: Mutation
  }
  
  directive @is(class: String) on OBJECT | INPUT_OBJECT
  
  directive @property(iri: String) on FIELD_DEFINITION | INPUT_FIELD_DEFINITION
  
  directive @identifier on FIELD_DEFINITION
  
  type Query {
    address(id: String): Address
    addressCollection: [Address]
    contact(id: String): Contact
    contactCollection: [Contact]
    organization(id: String): Organization
    organizationCollection: [Organization]
  }
  
  type Mutation {
    createAddress(input: CreateAddressInput!): Address!
    createContact(input: CreateContactInput!): Contact!
    createOrganization(input: CreateOrganizationInput!): Organization!
    mutateAddress(id: ID!): AddressMutation
    mutateContact(id: ID!): ContactMutation
    mutateOrganization(id: ID!): OrganizationMutation
  }
  
  type Address @is(class: "http://schema.org/PostalAddress") {
    "Auto-generated property that will be assigned to the \`iri\` of the Thing that is being queried."
    id: ID! @identifier
    city: String! @property(iri: "http://schema.org/addressLocality")
    country: String! @property(iri: "http://schema.org/addressCountry")
    postalCode: String! @property(iri: "http://schema.org/postalCode")
    streetLine: String! @property(iri: "http://schema.org/streetAddress")
  }
  
  type AddressMutation @is(class: "http://schema.org/PostalAddress") {
    delete: Address!
    update(input: UpdateAddressInput!): Address!
  }
  
  type Contact @is(class: "http://schema.org/Person") {
    "Auto-generated property that will be assigned to the \`iri\` of the Thing that is being queried."
    id: ID! @identifier
    address: Address @property(iri: "http://schema.org/address")
    email: [String] @property(iri: "http://schema.org/email")
    familyName: String! @property(iri: "http://schema.org/familyName")
    givenName: String! @property(iri: "http://schema.org/givenName")
    worksFor: [Organization] @property(iri: "http://schema.org/worksFor")
  }
  
  type ContactMutation @is(class: "http://schema.org/Person") {
    delete: Contact!
    update(input: UpdateContactInput!): Contact!
    addWorksFor(input: CreateOrganizationInput!): Contact!
    clearAddress: Contact!
    linkWorksFor(id: ID!): Contact!
    removeWorksFor(id: ID!): Contact!
    setAddress(input: CreateAddressInput!): Contact!
    unlinkWorksFor(id: ID!): Contact!
  }
  
  type Organization @is(class: "http://schema.org/Organization") {
    "Auto-generated property that will be assigned to the \`iri\` of the Thing that is being queried."
    id: ID! @identifier
    address: Address @property(iri: "http://schema.org/address")
    name: String! @property(iri: "http://schema.org/name")
  }
  
  type OrganizationMutation @is(class: "http://schema.org/Organization") {
    delete: Organization!
    update(input: UpdateOrganizationInput!): Organization!
    clearAddress: Organization!
    setAddress(input: CreateAddressInput!): Organization!
  }
  
  input CreateAddressInput @is(class: "http://schema.org/PostalAddress") {
    "Optional URI to use as an identifier for the new instance. One of the 'id' or 'slug' fields must be set!"
    id: ID
    "Optional slug that is combined with the context of the request to generate an identifier for the new instance. One of the 'id' or 'slug' fields must be set!"
    slug: String
    city: String! @property(iri: "http://schema.org/addressLocality")
    country: String! @property(iri: "http://schema.org/addressCountry")
    postalCode: String! @property(iri: "http://schema.org/postalCode")
    streetLine: String! @property(iri: "http://schema.org/streetAddress")
  }
  
  input CreateContactInput @is(class: "http://schema.org/Person") {
    "Optional URI to use as an identifier for the new instance. One of the 'id' or 'slug' fields must be set!"
    id: ID
    "Optional slug that is combined with the context of the request to generate an identifier for the new instance. One of the 'id' or 'slug' fields must be set!"
    slug: String
    email: [String] @property(iri: "http://schema.org/email")
    familyName: String! @property(iri: "http://schema.org/familyName")
    givenName: String! @property(iri: "http://schema.org/givenName")
  }
  
  input CreateOrganizationInput @is(class: "http://schema.org/Organization") {
    "Optional URI to use as an identifier for the new instance. One of the 'id' or 'slug' fields must be set!"
    id: ID
    "Optional slug that is combined with the context of the request to generate an identifier for the new instance. One of the 'id' or 'slug' fields must be set!"
    slug: String
    name: String! @property(iri: "http://schema.org/name")
  }
  
  input UpdateAddressInput @is(class: "http://schema.org/PostalAddress") {
    city: String @property(iri: "http://schema.org/addressLocality")
    country: String @property(iri: "http://schema.org/addressCountry")
    postalCode: String @property(iri: "http://schema.org/postalCode")
    streetLine: String @property(iri: "http://schema.org/streetAddress")
  }
  
  input UpdateContactInput @is(class: "http://schema.org/Person") {
    email: [String] @property(iri: "http://schema.org/email")
    familyName: String @property(iri: "http://schema.org/familyName")
    givenName: String @property(iri: "http://schema.org/givenName")
  }
  
  input UpdateOrganizationInput @is(class: "http://schema.org/Organization") {
    name: String @property(iri: "http://schema.org/name")
  }`;
