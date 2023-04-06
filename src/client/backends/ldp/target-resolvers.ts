import { LdpClient } from "../../../commons";

export interface TargetResolver {
    resolve: (classIri: string, context: TargetResolverContext) => Promise<URL>;
}

export class TargetResolverContext {
    constructor(public ldpClient: LdpClient) { }
}

export class StaticTargetResolver implements TargetResolver {

    constructor(private targetUrl: string) {
        console.log('YES')
       
    }

    resolve = async (classIri: string, context: TargetResolverContext): Promise<URL> => {
        try {
            const target = new URL(this.targetUrl);
            return target;
        } catch {
            throw new Error('Target must be a valid URL!');
        }
    }

}
