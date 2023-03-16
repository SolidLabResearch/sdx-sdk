import { PathLike } from 'fs';
import { GraphQLSchema } from 'graphql';

declare class ShaclParserService {
    private parser;
    constructor();
    parseSHACL(path: PathLike): Promise<GraphQLSchema>;
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

export { ShaclParserService };
