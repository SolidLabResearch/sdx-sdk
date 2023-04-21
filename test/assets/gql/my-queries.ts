import { gql } from 'graphql-tag';

export const getContact = gql`
  query getContact($id: String!) {
    contact(id: $id) {
      id
      givenName
      familyName
      address {
        streetLine
      }
    }
  }
`;

export const getContacts = gql`
  query getContacts {
    contactCollection {
      id
      givenName
      familyName
    }
  }
`;

export const createContact = gql`
  mutation createContact($input: CreateContactInput!) {
    createContact(input: $input) {
      id
      givenName
      familyName
    }
  }
`;

export const deleteContact = gql`
  mutation deleteContact($id: ID!) {
    mutateContact(id: $id) {
      delete {
        id
        givenName
        familyName
      }
    }
  }
`;

export const flipNames = gql`
  mutation flipNames($id: ID!, $input: UpdateContactInput!) {
    mutateContact(id: $id) {
      update(input: $input) {
        id
        givenName
        familyName
      }
    }
  }
`;

export const setAddress = gql`
  mutation setAddress($id: ID!, $input: CreateAddressInput!) {
    mutateContact(id: $id) {
      setAddress(input: $input) {
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
  }
`;
