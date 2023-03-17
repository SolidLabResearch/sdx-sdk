import "./chunk-G42LTC7K.mjs";
import { print, graphql } from "graphql";
import * as legacy from "./legacy-sdx-client.js";
import { ShaclParserService } from "./shacl-parser.service.js";
const parser = new ShaclParserService();
async function dynamicSdkClient(file) {
  const generated = await import(file);
  const getSdk = generated["getSdk"];
  return getSdk(legacyRequester("http://localhost:3000/complex.ttl"));
}
function legacyRequester(podLocation) {
  return async (doc, vars, options) => {
    const query = print(doc);
    const schema = await parser.parseSHACL(".sdx/shacl");
    const result = await graphql({
      source: query,
      variableValues: vars,
      schema,
      fieldResolver: legacy.fieldResolver(podLocation)
    });
    return result;
  };
}
export {
  dynamicSdkClient,
  legacyRequester
};
