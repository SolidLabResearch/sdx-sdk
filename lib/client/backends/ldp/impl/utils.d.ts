import { Quad, NamedNode } from 'n3';
import { GraphQLType, GraphQLField, GraphQLInputField } from 'graphql';

declare function getSubGraphArray(source: Quad[], className: string, args: Record<string, any>): Promise<Quad[][]>;
declare function getSubGraph(source: Quad[], className: string, args: Record<string, any>): Promise<Quad[]>;
declare function getGraph(location: string): Promise<Quad[]>;
declare function getDirectives(type: GraphQLType | GraphQLField<any, any, any> | GraphQLInputField): Record<string, any>;
declare enum ResourceType {
    CONTAINER = 0,
    DOCUMENT = 1
}
interface IntermediateResult {
    quads: Quad[];
    parentClassIri?: string;
    resourceType: ResourceType;
    subject?: NamedNode;
    queryOverride?: boolean;
}

export { IntermediateResult, ResourceType, getDirectives, getGraph, getSubGraph, getSubGraphArray };
