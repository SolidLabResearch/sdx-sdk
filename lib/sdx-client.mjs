import "./chunk-G42LTC7K.mjs";
import { graphql, print } from "graphql";
import { LdpClient } from "./commons/ldp/ldp-client.js";
import { URI_SDX_GENERATE_SHACL_FOLDER } from "./constants.js";
import * as legacy from "./legacy-sdx-client.js";
import { ShaclReaderService } from "./shacl-reader.service.js";
const parser = new ShaclReaderService();
function legacyRequester(podLocation) {
  return async (doc, vars, options) => {
    const query = print(doc);
    if (!parser.primed) {
      await parser.primeCache(URI_SDX_GENERATE_SHACL_FOLDER);
    }
    const schema = await parser.parseSHACLs(URI_SDX_GENERATE_SHACL_FOLDER);
    const result = await graphql({
      source: query,
      variableValues: vars,
      schema,
      fieldResolver: legacy.fieldResolver(new LdpClient())
    });
    return result;
  };
}
export {
  legacyRequester
};
