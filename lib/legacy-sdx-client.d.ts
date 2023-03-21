import { GraphQLResolveInfo } from 'graphql';
import { Quad } from 'n3';
import { C as Context } from './context-dae7af42.js';

/**
 * Field resolver for legacy PODs.
 * @param location Location of the root graph.
 * @returns
 */
declare function fieldResolver<TArgs>(location: string): (source: Quad[], args: TArgs, context: Context, info: GraphQLResolveInfo) => Promise<unknown>;

export { fieldResolver };
