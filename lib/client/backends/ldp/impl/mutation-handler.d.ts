import { GraphQLResolveInfo } from 'graphql';
import { LdpClient } from '../../../../commons/ldp/ldp-client.js';
import { SolidLDPContext } from '../solid-ldp-backend.js';
import { QueryHandler } from './query-handler.js';
import { IntermediateResult } from './utils.js';
import 'axios';
import 'n3';
import '../../../../commons/auth/solid-client-credentials.js';
import 'graphql/jsutils/ObjMap';
import 'graphql/execution/execute';
import 'graphql/language/ast';
import '../target-resolvers.js';

declare class MutationHandler {
    private ldpClient;
    constructor(ldpClient: LdpClient);
    handleMutation<TArgs>(source: IntermediateResult, args: TArgs, context: SolidLDPContext, info: GraphQLResolveInfo, rootTypes: string[], queryHandler: QueryHandler): Promise<unknown>;
    private handleCreateMutation;
    private handleGetMutateObjectType;
    private handleDeleteMutation;
    private handleUpdateMutation;
    private getDirectives;
    private getNewInstanceID;
    private generateTriplesForInput;
    private generateTriplesForUpdate;
    private TODO;
}

export { MutationHandler };
