import { graphql, print } from "graphql";
import { ExecutionResult } from "graphql/execution/execute";
import { DocumentNode } from "graphql/language/ast";
import { SolidClientCredentials } from "../../commons/auth/solid-client-credentials";
import { LdpClient } from "../../commons/ldp/ldp-client";
import { URI_SDX_GENERATE_GRAPHQL_SCHEMA, URI_SDX_GENERATE_SHACL_FOLDER } from "../../constants";
import * as legacy from "../../legacy-sdx-client.js";
import { ShaclReaderService } from "../../shacl-reader.service";
import { StaticTargetResolver, TargetResolver } from "./target-resolvers";

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
    private ldpClient: LdpClient;
    private defaultContext?: SolidLDPContext;

    constructor(options?: SolidLDPBackendOptions) {
        // Default to generated schema location
        this.schemaFile = options?.schemaFile || URI_SDX_GENERATE_GRAPHQL_SCHEMA;
        this.defaultContext = options?.defaultContext;
        this.ldpClient = new LdpClient(options?.clientCredentials);
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
            fieldResolver: legacy.fieldResolver(this.ldpClient)
        });
        // console.log(result.errors)
        return result as ExecutionResult<R>;
    }

}

export interface SolidTargetBackend<C extends SolidTargetBackendContext, E = unknown> {
    requester: <R, V>(doc: DocumentNode, vars?: V, context?: C) => Promise<ExecutionResult<R, E>>;
}

export interface SolidTargetBackendContext { };
