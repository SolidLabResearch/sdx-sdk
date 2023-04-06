import * as graphql_jsutils_ObjMap from 'graphql/jsutils/ObjMap';
import { ExecutionResult } from 'graphql/execution/execute';
import { DocumentNode } from 'graphql/language/ast';
import { SolidClientCredentials } from '../../../commons/auth/solid-client-credentials.js';
import { TargetResolver } from './target-resolvers.js';
import '../../../commons/ldp/ldp-client.js';
import 'axios';
import 'n3';

declare class SolidLDPContext implements SolidTargetBackendContext {
    resolver: TargetResolver;
    constructor(staticUrl: string);
    constructor(resolver: TargetResolver);
}
interface SolidLDPBackendOptions {
    schemaFile?: string;
    clientCredentials?: SolidClientCredentials;
    defaultContext?: SolidLDPContext;
}
declare class SolidLDPBackend implements SolidTargetBackend<SolidLDPContext> {
    private schemaFile;
    private defaultContext?;
    private queryHandler;
    private mutationHandler;
    private rootTypes;
    constructor(options?: SolidLDPBackendOptions);
    requester: <R, V>(doc: DocumentNode, vars?: V | undefined, context?: SolidLDPContext) => Promise<ExecutionResult<R, graphql_jsutils_ObjMap.ObjMap<unknown>>>;
    private fieldResolver;
}
interface SolidTargetBackend<C extends SolidTargetBackendContext, E = unknown> {
    requester: <R, V>(doc: DocumentNode, vars?: V, context?: C) => Promise<ExecutionResult<R, E>>;
}
interface SolidTargetBackendContext {
}

export { SolidLDPBackend, SolidLDPBackendOptions, SolidLDPContext, SolidTargetBackend, SolidTargetBackendContext };
