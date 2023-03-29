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
    * Generates a Mutation EntryPoint RootMutationType
    * @param types
    * @returns
    */
    private generateMutationEntryPoints;
    /**
     * Generates an InputObject type, typically used as an argument in a mutator (always NonNull)
     * @param type
     * @param name
     * @returns
     */
    private generateInputObjectType;
    /**
     * Generate the Mutation Type for existing Types
     * @param type Original ObjectType
     * @param context
     * @returns
     */
    private generateMutationObjectType;
    /**
     * Generate the fields for a MutationObjectType
     * @param type Original ObjectType
     * @param context
     * @returns
     */
    private generateMutationObjectTypeFields;
    /**
     * Generate fields for a MutationObjectType when the field of the original has a collection return type
     * @param field Original field
     * @param parentType Original Object Type
     * @param context
     * @returns
     */
    private generateMutationObjectTypeFieldsForCollection;
    /**
     * Generate fields for a MutationObjectType when the field of the original has a singular return type
     * @param field Original field
     * @param parentType Original Object Type
     * @param context
     * @returns
     */
    private generateMutationObjectTypeFieldsForSingular;
    /**
     * Generates a GraphQLObjectType from a Shape
     * @param shape
     * @returns
     */
    private generateObjectType;
}

export { ShaclReaderService };
