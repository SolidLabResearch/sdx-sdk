import { GraphQLResolveInfo, graphql, print } from "graphql";
import { ExecutionResult } from "graphql/execution/execute";
import { DocumentNode } from "graphql/language/ast";
import { LdpClient, SolidClientCredentials } from "../../../commons";
import { URI_SDX_GENERATE_GRAPHQL_SCHEMA, URI_SDX_GENERATE_SHACL_FOLDER } from "../../../constants";
import { ShaclReaderService } from "../../../parse";
import * as legacy from "./impl/legacy-sdx-client.js";
import { StaticTargetResolver, TargetResolver } from "./target-resolvers";
import { QueryHandler } from "./impl/query-handler";
import { MutationHandler } from "./impl/mutation-handler";
import { IntermediateResult, ResourceType } from "./impl/utils";

export class SolidLDPContext implements SolidTargetBackendContext {
    resolver: TargetResolver;

    constructor(staticUrl: string);
    constructor(resolver: TargetResolver);
    constructor(staticUrlOrResolver: TargetResolver | string) {
        if (typeof staticUrlOrResolver === 'string') {
            this.resolver = new StaticTargetResolver(staticUrlOrResolver);
        } else {
            this.resolver = staticUrlOrResolver;
        }
    }
}

export interface SolidLDPBackendOptions {
    schemaFile?: string;
    clientCredentials?: SolidClientCredentials;
    defaultContext?: SolidLDPContext;
}

export class SolidLDPBackend implements SolidTargetBackend<SolidLDPContext> {
    private schemaFile: string;
    private defaultContext?: SolidLDPContext;
    private queryHandler: QueryHandler;
    private mutationHandler: MutationHandler;

    constructor(options?: SolidLDPBackendOptions) {
        // TODO: Use schema to parse, instead of SHACL files
        // Default to generated schema location
        this.schemaFile = options?.schemaFile || URI_SDX_GENERATE_GRAPHQL_SCHEMA;
        this.defaultContext = options?.defaultContext;
        const ldpClient = new LdpClient(options?.clientCredentials);
        this.queryHandler = new QueryHandler(ldpClient);
        this.mutationHandler = new MutationHandler(ldpClient);
    }

    requester = async <R, V>(doc: DocumentNode, vars?: V, context?: SolidLDPContext): Promise<ExecutionResult<R>> => {
        // If no options, try setting a default context as options
        context = context ?? this.defaultContext;
        const parser = new ShaclReaderService();
        const query = print(doc);
        if (!parser.primed) {
            await parser.primeCache(URI_SDX_GENERATE_SHACL_FOLDER);
        }
        const schema = await parser.parseSHACLs(URI_SDX_GENERATE_SHACL_FOLDER);

        const result = await graphql({
            source: query,
            variableValues: vars!,
            schema,
            contextValue: context,
            fieldResolver: this.fieldResolver
        });
        // console.log(result.errors)
        return result as ExecutionResult<R>;
    }

    private fieldResolver = async <TArgs>(source: IntermediateResult, args: TArgs, context: SolidLDPContext, info: GraphQLResolveInfo): Promise<unknown> => {
        const { schema, operation } = info;
        // setup intermediate result
        source = source ?? {
            quads: [],
            resourceType: ResourceType.DOCUMENT
        }

        const rootTypes = [
            schema.getQueryType()?.name,
            schema.getMutationType()?.name,
            schema.getSubscriptionType()?.name,
        ].filter(t => !!t) as string[];

        if ('query' === operation.operation) {
            return this.queryHandler.handleQuery(source, args, context, info, rootTypes);
        }
        if ('mutation' === operation.operation) {
            return this.mutationHandler.handleMutation(source, args, context, info, rootTypes, this.queryHandler);
        }

    }
}

export interface SolidTargetBackend<C extends SolidTargetBackendContext, E = unknown> {
    requester: <R, V>(doc: DocumentNode, vars?: V, context?: C) => Promise<ExecutionResult<R, E>>;
}

export interface SolidTargetBackendContext { };
