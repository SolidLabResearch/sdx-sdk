import axios, { AxiosResponse } from 'axios';
import { DataFactory, Parser, Quad, Writer } from 'n3';
import { SolidClientCredentials } from '../auth/solid-client-credentials';
import { Graph } from '../graph';
import { ResourceType } from '../../client/backends/ldp/impl/utils';

const { namedNode } = DataFactory;

const CONTENT_TYPE_TURTLE = 'text/turtle';
const LDP_CONTAINS = namedNode('http://www.w3.org/ns/ldp#contains');
const LINK_HEADER = 'Link';
const IS_CONTAINER_LINK_HEADER_VAL =
  '<http://www.w3.org/ns/ldp#Container>; rel="type"';
const IS_RESOURCE_LINK_HEADER_VAL =
  '<http://www.w3.org/ns/ldp#Resource>; rel="type"';

export class LdpClient {
  private clientCredentials?: SolidClientCredentials;

  constructor(clientCredentials?: SolidClientCredentials) {
    this.clientCredentials = clientCredentials;
  }

  async patchDocument(
    url: URL,
    inserts: Quad[] | Graph | null = null,
    deletes: Quad[] | Graph | null = null
  ): Promise<AxiosResponse> {
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

    const resp = await axios.patch(url.toString(), requestBody, {
      headers: {
        'Content-Type': 'text/n3'
      }
    });

    if (resp.status < 200 || resp.status > 399) {
      throw new Error(
        `The patch was not completed successfully (status: ${resp.status}, message: ${resp.data})`
      );
    }
    return resp;
  }

  async putDocument(location: URL, content: Graph): Promise<AxiosResponse> {
    let body;
    const writer = new Writer({ format: 'Turtle' });
    writer.addQuads(content.getQuads());
    writer.end(async (_, result) => (body = result));
    const resp = await axios.put(location.toString(), body, {
      headers: {
        'Content-Type': CONTENT_TYPE_TURTLE
      }
    });
    if (resp.status < 200 || resp.status > 399) {
      throw new Error(
        `The PUT was not completed successfully (status: ${resp.status}, message: ${resp.data})`
      );
    }
    return resp;
  }

  async deleteDocument(location: URL): Promise<AxiosResponse> {
    const resp = await axios.delete(location.toString());
    if (resp.status < 200 || resp.status > 399) {
      throw new Error(
        `The DELETE was not completed successfully (status: ${resp.status}, message: ${resp.data})`
      );
    }
    return resp;
  }

  async fetchResourceType(location: URL): Promise<ResourceType> {
    const resp = await axios.head(location.toString());

    // Get type using link header
    const linkHeaderValue = resp.headers[LINK_HEADER] ?? [];
    if (
      linkHeaderValue === IS_CONTAINER_LINK_HEADER_VAL ||
      (linkHeaderValue as string[]).includes(IS_CONTAINER_LINK_HEADER_VAL)
    ) {
      return ResourceType.CONTAINER;
    } else if (
      linkHeaderValue === IS_RESOURCE_LINK_HEADER_VAL ||
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
    const doc = await axios.get(location.toString());
    return new Graph(new Parser().parse(doc.data));
  }

  async downloadContainerAsGraph(location: URL): Promise<Graph> {
    const containerResp = await axios.get(location.toString(), {
      headers: { Accept: CONTENT_TYPE_TURTLE }
    });
    const containerIndex = new Graph(new Parser().parse(containerResp.data));
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
