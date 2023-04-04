import { GraphQLResolveInfo } from 'graphql';
import { Quad, NamedNode } from 'n3';
import { C as Context } from './context-e8613b6b.js';
import { ResourceType } from './types.js';

interface IntermediateResult {
    requestUrl: string;
    resourceType: ResourceType;
    quads: Quad[];
    subject?: NamedNode;
}
/**
 * Field resolver for legacy PODs.
 * @param location Location of the root graph.
 * @returns
 */
declare function fieldResolver<TArgs>(location: string): (source: IntermediateResult, args: TArgs, context: Context, info: GraphQLResolveInfo) => Promise<unknown>;

export { IntermediateResult, fieldResolver };
