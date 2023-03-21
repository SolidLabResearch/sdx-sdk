import { GraphQLSchema } from 'graphql';

declare class ShaclReaderService {
    private parser;
    private _cache;
    primed: boolean;
    constructor();
    primeCache(uri: string): Promise<void>;
    parseSHACLs(uri: string): Promise<GraphQLSchema>;
    /**
     * Generates the entry points for the GraphQL Query schema
     * @param types
     * @returns
     */
    private generateEntryPoints;
    /**
     * Generates a GraphQLObjectType from a Shape
     * @param shape
     * @returns
     */
    private generateObjectType;
}

export { ShaclReaderService };
