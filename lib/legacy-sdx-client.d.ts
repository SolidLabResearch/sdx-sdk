import { DocumentNode } from 'graphql';

type Requester<C = {}, E = unknown> = <R, V>(doc: DocumentNode, vars?: V, options?: C) => Promise<R> | AsyncIterable<R>;
declare class LegacySdxClient {
    private podLocation;
    private parser;
    constructor(podLocation: string);
    request: Requester<{}>;
    private getSchema;
    query<T>(query: string, location?: string): Promise<T>;
    private fieldResolver;
}

export { LegacySdxClient };
