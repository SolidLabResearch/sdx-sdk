import "../../chunk-G42LTC7K.mjs";
import { graphql, print } from "graphql";
import { LdpClient } from "../../commons/ldp/ldp-client";
import { URI_SDX_GENERATE_GRAPHQL_SCHEMA, URI_SDX_GENERATE_SHACL_FOLDER } from "../../constants";
import * as legacy from "../../legacy-sdx-client.js";
import { ShaclReaderService } from "../../shacl-reader.service";
import { StaticTargetResolver } from "./target-resolvers";
class SolidLDPContext {
  constructor(staticUrlOrResolver) {
    if (typeof staticUrlOrResolver === "string") {
      this.resolver = new StaticTargetResolver(staticUrlOrResolver);
    } else {
      this.resolver = staticUrlOrResolver;
    }
  }
}
class SolidLDPBackend {
  constructor(options) {
    this.requester = async (doc, vars, context) => {
      context = context ?? this.defaultContext;
      const parser = new ShaclReaderService();
      const query = print(doc);
      if (!parser.primed) {
        await parser.primeCache(URI_SDX_GENERATE_SHACL_FOLDER);
      }
      const schema = await parser.parseSHACLs(URI_SDX_GENERATE_SHACL_FOLDER);
      const result = await graphql({
        source: query,
        variableValues: vars,
        schema,
        contextValue: context,
        fieldResolver: legacy.fieldResolver(this.ldpClient)
      });
      return result;
    };
    this.schemaFile = options?.schemaFile || URI_SDX_GENERATE_GRAPHQL_SCHEMA;
    this.defaultContext = options?.defaultContext;
    this.ldpClient = new LdpClient(options?.clientCredentials);
  }
}
;
export {
  SolidLDPBackend,
  SolidLDPContext
};
