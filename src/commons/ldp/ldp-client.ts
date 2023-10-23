import {
  KeyPair,
  buildAuthenticatedFetch,
  createDpopHeader,
  generateDpopKeyPair
} from '@inrupt/solid-client-authn-core';
import { DataFactory, Parser, Quad, Writer } from 'n3';
import { ResourceType } from '../../client/backends/ldp/impl/utils';
import { SolidClientCredentials } from '../auth/solid-client-credentials';
import { Graph } from '../graph';
import { Base64 } from 'js-base64';

const { namedNode } = DataFactory;

const CONTENT_TYPE_TURTLE = 'text/turtle';
const LDP_CONTAINS = namedNode('http://www.w3.org/ns/ldp#contains');
const LINK_HEADER = 'link';
const IS_CONTAINER_LINK_HEADER_VAL =
  '<http://www.w3.org/ns/ldp#Container>; rel="type"';
const IS_RESOURCE_LINK_HEADER_VAL =
  '<http://www.w3.org/ns/ldp#Resource>; rel="type"';

export class LdpClient {
  private clientCredentials?: SolidClientCredentials;
  private authFetch?: typeof fetch;
  private dpopKey?: KeyPair;

  constructor(clientCredentials?: SolidClientCredentials) {
    this.clientCredentials = clientCredentials;
    if (clientCredentials) {
      this.getDPoPKey();
    }
  }

  private async getDPoPKey(): Promise<KeyPair> {
    if (!this.dpopKey) {
      this.dpopKey = await generateDpopKeyPair();
    }
    return this.dpopKey;
  }

  private async getAccessToken(): Promise<string> {
    const {
      clientId,
      clientSecret: clientSercret,
      identityServerUrl
    } = this.clientCredentials!;
    const dpopKey = await this.getDPoPKey();
    const authString = `${encodeURIComponent(clientId)}:${encodeURIComponent(
      clientSercret
    )}`;
    const wellKnownUrl = `${identityServerUrl}/.well-known/openid-configuration`;
    const token_endpoint = await fetch(wellKnownUrl)
      .then((res) => res.json())
      .then((json) => json.token_endpoint);
    const response = await fetch(token_endpoint, {
      method: 'POST',
      body: 'grant_type=client_credentials&scope=webid',

      headers: {
        //TODO: use JSbase64
        Authorization: `Basic ${Base64.encode(authString)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        dpop: await createDpopHeader(token_endpoint, 'POST', dpopKey)
      }
    });
    const json = await response.json();
    return json.access_token;
  }

  async getAuthFetch(): Promise<typeof fetch> {
    if (!this.authFetch && this.clientCredentials) {
      this.authFetch = await buildAuthenticatedFetch(
        fetch,
        await this.getAccessToken(),
        {
          dpopKey: await this.getDPoPKey()
        }
      );
    }
    return this.clientCredentials ? this.authFetch! : fetch;
  }

  async patchDocument(
    url: URL,
    inserts: Quad[] | Graph | null = null,
    deletes: Quad[] | Graph | null = null
  ): Promise<Response> {
    inserts = inserts && !Array.isArray(inserts) ? inserts.getQuads() : inserts;
    deletes = deletes && !Array.isArray(deletes) ? deletes.getQuads() : deletes;
    const insertsWriter = new Writer({
      format: 'N-Triples',
      prefixes: { solid: 'http://www.w3.org/ns/solid/terms#' }
    });
    const deletesWriter = new Writer({
      format: 'N-Triples',
      prefixes: { solid: 'http://www.w3.org/ns/solid/terms#' }
    });
    let n3Inserts = null;
    let n3Deletes = null;

    if (inserts) {
      insertsWriter.addQuads(inserts);
      insertsWriter.end(
        (_, result) => (n3Inserts = `solid:inserts { ${result} }`)
      );
    }
    if (deletes) {
      deletesWriter.addQuads(deletes);
      deletesWriter.end(
        (_, result) => (n3Deletes = `solid:deletes { ${result} }`)
      );
    }

    const patchContent =
      [n3Inserts, n3Deletes].filter((item) => item != null).join(';') + '.';
    const requestBody = `@prefix solid: <http://www.w3.org/ns/solid/terms#>.\n_:rename a solid:InsertDeletePatch;\n${patchContent}`;

    const authFetch = await this.getAuthFetch();
    const resp = await authFetch(url.toString(), {
      method: 'PATCH',
      headers: { 'Content-Type': 'text/n3' },
      body: requestBody
    });

    if (resp.status < 200 || resp.status > 399) {
      throw new Error(
        `The patch was not completed successfully (status: ${
          resp.status
        }, message: ${await resp.text()})`
      );
    }
    return resp;
  }

  async putDocument(location: URL, content: Graph): Promise<Response> {
    let body;
    const writer = new Writer({ format: 'Turtle' });
    writer.addQuads(content.getQuads());
    writer.end(async (_, result) => (body = result));
    const authFetch = await this.getAuthFetch();
    const resp = await authFetch(location.toString(), {
      method: 'PUT',
      headers: { 'Content-Type': CONTENT_TYPE_TURTLE },
      body
    });
    if (resp.status < 200 || resp.status > 399) {
      throw new Error(
        `The PUT was not completed successfully (status: ${
          resp.status
        }, message: ${await resp.text()})`
      );
    }
    return resp;
  }

  async deleteDocument(location: URL): Promise<Response> {
    const authFetch = await this.getAuthFetch();
    const resp = await authFetch(location.toString(), { method: 'DELETE' });
    if (resp.status < 200 || resp.status > 399) {
      throw new Error(
        `The DELETE was not completed successfully (status: ${
          resp.status
        }, message: ${await resp.text()})`
      );
    }
    return resp;
  }

  async fetchResourceType(location: URL): Promise<ResourceType> {
    const authFetch = await this.getAuthFetch();
    const resp = await authFetch(location.toString(), {
      method: 'HEAD'
    });
    // const linkHeaderValue = getHeader(resp.headers, LINK_HEADER);
    const linkHeaderValue = resp.headers.get(LINK_HEADER)?.split(',');
    if ((linkHeaderValue as string[]).includes(IS_CONTAINER_LINK_HEADER_VAL)) {
      return ResourceType.CONTAINER;
    } else if (
      (linkHeaderValue as string[]).includes(IS_RESOURCE_LINK_HEADER_VAL)
    ) {
      return ResourceType.DOCUMENT;
    } else {
      throw new Error(
        'The target URL does not represent an LDP container or resource type!'
      );
    }
  }

  async downloadDocumentGraph(location: URL): Promise<Graph> {
    const authFetch = await this.getAuthFetch();
    const doc = await authFetch(location.toString());
    const txt = await doc.text();
    return new Graph(new Parser().parse(txt));
  }

  async downloadContainerAsGraph(location: URL): Promise<Graph> {
    const authFetch = await this.getAuthFetch();
    const containerResp = await authFetch(location.toString(), {
      headers: {
        Accept: CONTENT_TYPE_TURTLE
      }
    });
    const txt = await containerResp.text();
    const containerIndex = new Graph(new Parser().parse(txt));
    const resultGraph = new Graph();
    containerIndex.find(null, LDP_CONTAINS, null).map(async (child) => {
      const subGraph = await this.downloadDocumentGraph(
        new URL(child.object.value)
      );
      resultGraph.addGraph(subGraph);
    });
    return resultGraph;
  }
}
