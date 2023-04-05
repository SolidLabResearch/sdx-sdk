import { GraphQLResolveInfo } from 'graphql';
import { Quad, NamedNode } from 'n3';
import { LdpClient } from './commons/ldp/ldp-client.js';
import { ResourceType } from './types.js';
import { SolidLDPContext } from './backends/ldp/solid-ldp-backend.js';
import 'axios';
import './commons/auth/solid-client-credentials.js';
import 'graphql/jsutils/ObjMap';
import 'graphql/execution/execute';
import 'graphql/language/ast';
import './backends/ldp/target-resolvers.js';

interface IntermediateResult {
    quads: Quad[];
    parentClassIri?: string;
    resourceType: ResourceType;
    subject?: NamedNode;
}
/**
 * Field resolver for legacy PODs.
 * @param location Location of the root graph.
 * @returns
 */
declare function fieldResolver<TArgs>(ldpClient: LdpClient): (source: IntermediateResult, args: TArgs, context: SolidLDPContext, info: GraphQLResolveInfo) => Promise<unknown>;

export { IntermediateResult, fieldResolver };
