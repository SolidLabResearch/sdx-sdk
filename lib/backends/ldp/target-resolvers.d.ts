import { LdpClient } from '../../commons/ldp/ldp-client.js';
import 'axios';
import 'n3';
import '../../commons/auth/solid-client-credentials.js';

interface TargetResolver {
    resolve: (classIri: string, context: TargetResolverContext) => Promise<URL>;
}
declare class TargetResolverContext {
    ldpClient: LdpClient;
    constructor(ldpClient: LdpClient);
}
declare class StaticTargetResolver implements TargetResolver {
    private targetUrl;
    constructor(targetUrl: string);
    resolve: (classIri: string, context: TargetResolverContext) => Promise<URL>;
}

export { StaticTargetResolver, TargetResolver, TargetResolverContext };
