import "./chunk-G42LTC7K.mjs";
import axios from "axios";
import { Writer } from "n3";
class LdpClient {
  async patchDocument(url, inserts = null, deletes = null) {
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
    const patchContent = [n3Inserts, n3Deletes].filter((item) => item != null).join(";") + ".";
    console.log(patchContent);
    const requestBody = `@prefix solid: <http://www.w3.org/ns/solid/terms#>.
_:rename a solid:InsertDeletePatch;
${patchContent}`;
    console.log(requestBody);
    const resp = await axios.patch(url, requestBody, {
      headers: {
        "Content-Type": "text/n3"
      }
    });
    if (resp.status < 200 || resp.status > 399) {
      throw new Error(`The patch was not completed successfully (status: ${resp.status}, message: ${resp.data})`);
    }
    console.log(resp);
    return resp;
  }
}
export {
  LdpClient
};
