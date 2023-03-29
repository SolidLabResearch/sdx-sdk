import axios from 'axios';
import { Quad, Writer } from "n3"

export class LdpClient {

    async patchDocument(url: string, inserts: Quad[] | null = null, deletes: Quad[] | null = null) {
        console.log(url);
        console.log(inserts);


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
        console.log(patchContent);
        const requestBody = `@prefix solid: <http://www.w3.org/ns/solid/terms#>.\n_:rename a solid:InsertDeletePatch;\n${patchContent}`
        console.log(requestBody);

        const resp = await axios.patch(url, requestBody, {
            headers: {
                'Content-Type': 'text/n3'
            }
        });

        if (resp.status < 200 || resp.status > 399) {
            throw new Error(`The patch was not completed successfully (status: ${resp.status}, message: ${resp.data})`);
        }
        console.log(resp);
        return resp;
        // const resp = webClient.patchAbs(url.toString()).putHeader(HttpHeaders.CONTENT_TYPE, "text/n3")
        //     .sendBuffer(Buffer.buffer(requestBody)).toCompletionStage().await()
        // if (resp.statusCode()! in 200..399) {
        //     throw RuntimeException("The patch was not completed successfully (status: ${resp.statusCode()}, message: ${resp.bodyAsString()})")
        // }
    }
}
