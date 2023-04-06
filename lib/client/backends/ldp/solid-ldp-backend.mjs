import "../../../chunk-G42LTC7K.mjs";
import { graphql, print } from "graphql";
import { LdpClient } from "../../../commons";
import { URI_SDX_GENERATE_GRAPHQL_SCHEMA, URI_SDX_GENERATE_SHACL_FOLDER } from "../../../constants";
import { ShaclReaderService } from "../../../parse";
import { StaticTargetResolver } from "./target-resolvers";
import { QueryHandler } from "./impl/query-handler";
import { MutationHandler } from "./impl/mutation-handler";
import { ResourceType } from "./impl/utils";
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
        fieldResolver: this.fieldResolver
      });
      return result;
    };
    this.fieldResolver = async (source, args, context, info) => {
      const { schema, operation } = info;
      source = source ?? {
        quads: [],
        resourceType: ResourceType.DOCUMENT
      };
      const rootTypes = [
        schema.getQueryType()?.name,
        schema.getMutationType()?.name,
        schema.getSubscriptionType()?.name
      ].filter((t) => !!t);
      if ("query" === operation.operation) {
        return this.queryHandler.handleQuery(source, args, context, info, rootTypes);
      }
      if ("mutation" === operation.operation) {
        return this.mutationHandler.handleMutation(source, args, context, info, rootTypes, this.queryHandler);
      }
    };
    this.schemaFile = options?.schemaFile || URI_SDX_GENERATE_GRAPHQL_SCHEMA;
    this.defaultContext = options?.defaultContext;
    const ldpClient = new LdpClient(options?.clientCredentials);
    this.queryHandler = new QueryHandler(ldpClient);
    this.mutationHandler = new MutationHandler(ldpClient);
  }
}
;
export {
  SolidLDPBackend,
  SolidLDPContext
};
