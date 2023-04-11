import "../../../chunk-G42LTC7K.mjs";
import { graphql, print } from "graphql";
import { LdpClient } from "../../../commons";
import { URI_SDX_GENERATE_GRAPHQL_SCHEMA, URI_SDX_GENERATE_SHACL_FOLDER } from "../../../constants";
import { ShaclReaderService } from "../../../parse";
import { MutationHandler } from "./impl/mutation-handler";
import { QueryHandler } from "./impl/query-handler";
import { ResourceType } from "./impl/utils";
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
    this.rootTypes = [];
    this.requester = async (doc, vars, context) => {
      context = context ?? this.defaultContext;
      const parser = new ShaclReaderService();
      const query = print(doc);
      if (!parser.primed) {
        await parser.primeCache(URI_SDX_GENERATE_SHACL_FOLDER);
      }
      const schema = await parser.parseSHACLs(URI_SDX_GENERATE_SHACL_FOLDER);
      this.rootTypes = [
        schema.getQueryType()?.name,
        schema.getMutationType()?.name,
        schema.getSubscriptionType()?.name
      ].filter((t) => !!t);
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
      if ("mutation" === operation.operation && !source.queryOverride) {
        return this.mutationHandler.handleMutation(source, args, context, info, this.rootTypes);
      }
      if ("query" === operation.operation || source.queryOverride) {
        return this.queryHandler.handleQuery(source, args, context, info, this.rootTypes);
      }
    };
    this.schemaFile = options?.schemaFile || URI_SDX_GENERATE_GRAPHQL_SCHEMA;
    this.defaultContext = options?.defaultContext;
    const ldpClient = new LdpClient(options?.clientCredentials);
    this.queryHandler = new QueryHandler(ldpClient);
    this.mutationHandler = new MutationHandler(ldpClient);
  }
}
export {
  SolidLDPBackend,
  SolidLDPContext
};
