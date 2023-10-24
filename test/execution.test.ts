import { readFileSync } from 'fs';
import { readFile, readdir, rm, writeFile } from 'fs/promises';
import { Parser, Store, Writer } from 'n3';
import { SolidLDPBackend, SolidLDPContext } from '../src';
import {
  addWorksFor,
  clearAddress,
  createContact,
  deleteContact,
  flipNames,
  getContact,
  getContacts,
  linkAddWorksFor,
  linkSetAddress,
  removeWorksFor,
  setAddress,
  unlinkClearAddress,
  unlinkRemoveWorksFor
} from './assets/gql/my-queries';

const IS_RESOURCE_LINK_HEADER_VAL =
  '<http://www.w3.org/ns/ldp#Resource>; rel="type"';

const pickDataFile = async () => {
  const files = await readdir('test/assets/data');
  return files.includes('contacts.ttl.patch')
    ? await readFile('test/assets/data/contacts.ttl.patch')
    : await readFile('test/assets/data/contacts.ttl');
};

const resetDataFile = async () => {
  for (const file of await readdir('test/assets/data')) {
    if (file === 'contacts.ttl.patch') {
      await rm('test/assets/data/contacts.ttl.patch');
    }
  }
};

jest.spyOn(global, 'fetch').mockImplementation(
  jest.fn(async (uri: RequestInfo | URL, init?: RequestInit | undefined) => {
    switch (init?.method) {
      case 'HEAD':
        if (
          uri === 'http://mock/data' ||
          uri.toString().startsWith('http://mock/data')
        ) {
          const headers = new Headers({ Link: IS_RESOURCE_LINK_HEADER_VAL });
          return {
            headers
          };
        }
        break;
      case 'PATCH':
        {
          const data = init.body;
          const contacts_data = await pickDataFile();
          const quads = new Parser({ format: 'text/turtle' }).parse(
            contacts_data.toString()
          );
          const store = new Store(quads);
          const { inserts, deletes } = parseInsertsDeletes(data as string);

          store.removeQuads(deletes);
          store.addQuads(inserts);
          const writer = new Writer({ format: 'text/turtle' });

          writer.addQuads(store.getQuads(null, null, null, null));
          return new Promise((resolve) => {
            writer.end((error, res) => {
              writeFile('test/assets/data/contacts.ttl.patch', res).then(() => {
                resolve({
                  status: 201,
                  statusText: 'Created'
                });
              });
            });
          });
        }
        break;
      default:
      case 'GET':
        if (
          uri === 'http://mock/data' ||
          uri.toString().startsWith('http://mock/data')
        ) {
          const data = await pickDataFile();
          return new Response(data.toString());
        }
        break;
    }
  }) as jest.Mock
);

describe('GQL Schema executes', () => {
  const context = new SolidLDPContext('http://mock/data');
  const schema = readFileSync(
    'test/assets/gql/schema.graphqls',
    'utf-8'
  ).toString();
  const ldpBackend = new SolidLDPBackend({
    schema,
    defaultContext: context
  });

  beforeEach(async () => {
    await resetDataFile();
  });

  it('a query (single)', async () => {
    const result = await ldpBackend.rawRequester.call(
      ldpBackend.rawRequester,
      getContact,
      {
        id: 'http://example.org/cont/tdupont'
      }
    );
    expect(result).not.toBeUndefined();
    expect(result.data).not.toBeUndefined();
    expect(result.data).toHaveProperty('contact');
    const contact = (result.data! as any).contact;
    expect(contact).toMatchObject({
      id: 'http://example.org/cont/tdupont',
      givenName: 'Thomas',
      familyName: 'Dupont',
      address: {
        streetLine: 'Gerard Franchoostraat 6'
      }
    });
  });

  it('a query (collection)', async () => {
    const result = await ldpBackend.rawRequester.call(
      ldpBackend.rawRequester,
      getContacts
    );
    expect(result).not.toBeUndefined();
    expect(result.data).not.toBeUndefined();
    expect(result.data).toHaveProperty('contactCollection');
    const contacts = (result.data! as any).contactCollection;
    expect(contacts).toIncludeAllMembers([
      {
        id: 'http://example.org/cont/tdupont',
        givenName: 'Thomas',
        familyName: 'Dupont'
      },
      {
        id: 'http://example.org/cont/wkerckho',
        givenName: 'Wannes',
        familyName: 'Kerckhove'
      },
      {
        id: 'http://example.org/cont/pdemeest',
        givenName: 'Piet',
        familyName: 'Demeester'
      }
    ]);
  });

  it('a mutation (create)', async () => {
    const input = {
      id: 'http://example.org/cont/jdoe',
      givenName: 'John',
      familyName: 'Doe'
    };
    const result = await ldpBackend.rawRequester.call(
      ldpBackend.rawRequester,
      createContact,
      { input }
    );
    expect(result).not.toBeUndefined();
    expect(result.data).not.toBeUndefined();
    expect(result.data).toHaveProperty('createContact');
    const contact = (result.data! as any).createContact;
    expect(contact).toEqual({ ...input });
  });

  it('a mutation (delete)', async () => {
    const input = {
      id: 'http://example.org/cont/tdupont',
      givenName: 'Thomas',
      familyName: 'Dupont'
    };
    const result = await ldpBackend.rawRequester.call(
      ldpBackend.rawRequester,
      deleteContact,
      { id: input.id }
    );
    expect(result).not.toBeUndefined();
    expect(result.data).not.toBeUndefined();
    expect(result.data).toHaveProperty('mutateContact');
    const contact = (result.data! as any).mutateContact;
    expect(contact.delete).toEqual({ ...input });
  });

  it('a mutation (update scalars)', async () => {
    const input = {
      id: 'http://example.org/cont/tdupont',
      givenName: 'Thomas',
      familyName: 'Dupont'
    };
    const result = await ldpBackend.rawRequester.call(
      ldpBackend.rawRequester,
      flipNames,
      {
        id: input.id,
        input: {
          givenName: input.familyName,
          familyName: input.givenName
        }
      }
    );
    expect(result).not.toBeUndefined();
    expect(result.data).not.toBeUndefined();
    expect(result.data).toHaveProperty('mutateContact');
    const contact = (result.data! as any).mutateContact;
    expect(contact.update).toEqual({
      id: input.id,
      givenName: input.familyName,
      familyName: input.givenName
    });
  });

  it('a mutation (set non-scalar)', async () => {
    const obj = {
      id: 'http://example.org/cont/tdupont',
      streetLine: 'Heidestraat 92',
      postalCode: '9050',
      city: 'Gentbrugge',
      country: 'Belgium'
    };
    const { id, ...input } = obj;
    const result = await ldpBackend.rawRequester.call(
      ldpBackend.rawRequester,
      setAddress,
      {
        id,
        input
      }
    );
    expect(result).not.toBeUndefined();
    expect(result.data).not.toBeUndefined();
    expect(result.data).toHaveProperty('mutateContact');
    const contact = (result.data! as any).mutateContact;
    expect(contact.setAddress).toEqual({
      id,
      givenName: 'Thomas',
      familyName: 'Dupont',
      address: {
        streetLine: obj.streetLine,
        postalCode: obj.postalCode,
        city: obj.city,
        country: obj.country
      }
    });
  });

  it('a mutation (clear non-scalar)', async () => {
    const id = 'http://example.org/cont/tdupont';
    const result = await ldpBackend.rawRequester.call(
      ldpBackend.rawRequester,
      clearAddress,
      { id }
    );
    expect(result).not.toBeUndefined();
    expect(result.data).not.toBeUndefined();
    expect(result.data).toHaveProperty('mutateContact');
    const contact = (result.data! as any).mutateContact;
    expect(contact.clearAddress).toEqual({
      id,
      givenName: 'Thomas',
      familyName: 'Dupont',
      address: null
    });
  });

  it('a mutation (add non-scalar)', async () => {
    const id = 'http://example.org/cont/tdupont';
    const input = {
      id: 'http://example.org/org/extra',
      name: 'Extra'
    };
    const result = await ldpBackend.rawRequester.call(
      ldpBackend.rawRequester,
      addWorksFor,
      {
        id,
        input
      }
    );
    expect(result).not.toBeUndefined();
    expect(result.data).not.toBeUndefined();
    expect(result.data).toHaveProperty('mutateContact');
    const contact = (result.data! as any).mutateContact;
    expect(contact.addWorksFor).toEqual({
      id,
      givenName: 'Thomas',
      familyName: 'Dupont',
      address: {
        streetLine: 'Gerard Franchoostraat 6',
        postalCode: '8200',
        city: 'Brugge',
        country: 'Belgium'
      },
      worksFor: [
        { id: 'http://example.org/org/idlab', name: 'IDLab Gent' },
        { id: input.id, name: input.name }
      ]
    });
  });

  it('a mutation (remove non-scalar)', async () => {
    const id = 'http://example.org/cont/pdemeest';
    const orgId = 'http://example.org/org/idlab';
    const result = await ldpBackend.rawRequester.call(
      ldpBackend.rawRequester,
      removeWorksFor,
      { id, orgId }
    );
    expect(result).not.toBeUndefined();
    expect(result.data).not.toBeUndefined();
    expect(result.data).toHaveProperty('mutateContact');
    const contact = (result.data! as any).mutateContact;
    expect(contact.removeWorksFor).toEqual({
      id,
      givenName: 'Piet',
      familyName: 'Demeester',
      address: null,
      worksFor: [
        { id: 'http://example.org/org/ugent', name: 'Ghent University' }
      ]
    });
  });

  it('a mutation (link [set] non-scalar)', async () => {
    const link = 'http://example.org/addr/work';
    const id = 'http://example.org/cont/tdupont';
    const result = await ldpBackend.rawRequester.call(
      ldpBackend.rawRequester,
      linkSetAddress,
      {
        id,
        link
      }
    );
    expect(result).not.toBeUndefined();
    expect(result.data).not.toBeUndefined();
    expect(result.data).toHaveProperty('mutateContact');
    const contact = (result.data! as any).mutateContact;
    expect(contact.linkAddress).toEqual({
      id,
      givenName: 'Thomas',
      familyName: 'Dupont',
      address: {
        streetLine: 'Technologiepark-Zwijnaarde 126',
        postalCode: '9052',
        city: 'Zwijnaarde',
        country: 'Belgium'
      }
    });
  });

  it('a mutation (link [add] non-scalar)', async () => {
    const link = 'http://example.org/org/ugent';
    const id = 'http://example.org/cont/tdupont';
    const result = await ldpBackend.rawRequester.call(
      ldpBackend.rawRequester,
      linkAddWorksFor,
      {
        id,
        link
      }
    );
    expect(result).not.toBeUndefined();
    expect(result.data).not.toBeUndefined();
    expect(result.data).toHaveProperty('mutateContact');
    const contact = (result.data! as any).mutateContact;
    expect(contact.linkWorksFor).toEqual({
      id,
      givenName: 'Thomas',
      familyName: 'Dupont',
      address: {
        streetLine: 'Gerard Franchoostraat 6',
        postalCode: '8200',
        city: 'Brugge',
        country: 'Belgium'
      },
      worksFor: [
        { id: 'http://example.org/org/idlab', name: 'IDLab Gent' },
        { id: link, name: 'Ghent University' }
      ]
    });
  });

  it('a mutation (unlink [clear] non-scalar)', async () => {
    const id = 'http://example.org/cont/tdupont';
    const link = 'http://example.org/addr/home';
    const result = await ldpBackend.rawRequester.call(
      ldpBackend.rawRequester,
      unlinkClearAddress,
      { id, link }
    );
    expect(result).not.toBeUndefined();
    expect(result.data).not.toBeUndefined();
    expect(result.data).toHaveProperty('mutateContact');
    const contact = (result.data! as any).mutateContact;
    expect(contact.unlinkAddress).toEqual({
      id,
      givenName: 'Thomas',
      familyName: 'Dupont',
      address: null
    });
  });

  it('a mutation (unlink [remove] non-scalar)', async () => {
    const id = 'http://example.org/cont/pdemeest';
    const link = 'http://example.org/org/idlab';
    const result = await ldpBackend.rawRequester.call(
      ldpBackend.rawRequester,
      unlinkRemoveWorksFor,
      { id, link }
    );
    expect(result).not.toBeUndefined();
    expect(result.data).not.toBeUndefined();
    expect(result.data).toHaveProperty('mutateContact');
    const contact = (result.data! as any).mutateContact;
    expect(contact.unlinkWorksFor).toEqual({
      id,
      givenName: 'Piet',
      familyName: 'Demeester',
      address: null,
      worksFor: [
        { id: 'http://example.org/org/ugent', name: 'Ghent University' }
      ]
    });
  });
});

function parseInsertsDeletes(data: string) {
  const insertStartIdx = data.indexOf('solid:inserts {');
  const deleteStartIdx = data.indexOf('solid:deletes {');
  const insertStopIdx =
    data.slice(insertStartIdx).indexOf('}') + insertStartIdx;
  const deleteStopIdx =
    data.slice(deleteStartIdx).indexOf('}') + deleteStartIdx;
  const insertSlice = data.slice(
    insertStartIdx + 'solid:inserts {'.length,
    insertStopIdx
  );
  const deleteSlice = data.slice(
    deleteStartIdx + 'solid:deletes {'.length,
    deleteStopIdx
  );
  const parser = new Parser();
  const inserts = insertStartIdx > -1 ? parser.parse(insertSlice) : [];
  const deletes = deleteStartIdx > -1 ? parser.parse(deleteSlice) : [];

  return { inserts, deletes };
}
