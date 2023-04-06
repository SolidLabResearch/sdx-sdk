import { GraphQLResolveInfo } from 'graphql';
import { LdpClient } from '../../../../commons/ldp/ldp-client.js';
import { SolidLDPContext } from '../solid-ldp-backend.js';
import { IntermediateResult } from './utils.js';
import 'axios';
import 'n3';
import '../../../../commons/auth/solid-client-credentials.js';
import 'graphql/jsutils/ObjMap';
import 'graphql/execution/execute';
import 'graphql/language/ast';
import '../target-resolvers.js';

declare class QueryHandler {
    private ldpClient;
    constructor(ldpClient: LdpClient);
    handleQuery<TArgs>(source: IntermediateResult, args: TArgs, context: SolidLDPContext, info: GraphQLResolveInfo, rootTypes: string[]): Promise<IntermediateResult | unknown>;
    private getIdentifier;
    private getProperty;
    private getProperties;
}

export { QueryHandler };
