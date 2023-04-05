import axios, { AxiosResponse } from 'axios';
import { Quad, Writer } from "n3"
import { SolidClientCredentials } from '../auth/solid-client-credentials';

export class LdpClient {
    private clientCredentials?: SolidClientCredentials;

    constructor(clientCredentials?: SolidClientCredentials) {
        this.clientCredentials = clientCredentials;
    }

    async patchDocument(url: string, inserts: Quad[] | null = null, deletes: Quad[] | null = null): Promise<AxiosResponse> {
        const insertsWriter = new Writer({ format: "N-Triples", prefixes: { solid: "http://www.w3.org/ns/solid/terms#" } });
        const deletesWriter = new Writer({ format: "N-Triples", prefixes: { solid: "http://www.w3.org/ns/solid/terms#" } });
        let n3Inserts = null;
        let n3Deletes = null;

        if (inserts) {
            insertsWriter.addQuads(inserts);
            insertsWriter.end((_, result) => n3Inserts = `solid:inserts { ${result} }`);
        }
        if (deletes) {
            deletesWriter.addQuads(deletes);
            deletesWriter.end((_, result) => n3Deletes = `solid:deletes { ${result} }`);
        }

        const patchContent = [n3Inserts, n3Deletes].filter(item => item != null).join(';') + '.';
        const requestBody = `@prefix solid: <http://www.w3.org/ns/solid/terms#>.\n_:rename a solid:InsertDeletePatch;\n${patchContent}`

        const resp = await axios({method: 'patch', url, data: requestBody,
            headers: {
                'Content-Type': 'text/n3'
            }
        });

        if (resp.status < 200 || resp.status > 399) {
            throw new Error(`The patch was not completed successfully (status: ${resp.status}, message: ${resp.data})`);
        }
        return resp;
    }
}
