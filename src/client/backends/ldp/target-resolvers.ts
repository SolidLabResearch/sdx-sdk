import { LdpClient } from '../../../commons';

export interface TargetResolver {
  resolve: (classIri: string, context: TargetResolverContext) => Promise<URL>;
}

export class TargetResolverContext {
  constructor(public ldpClient: LdpClient) {}
}

export class StaticTargetResolver implements TargetResolver {
  private target: URL;

  constructor(private targetUrl: string) {
    try {
      this.target = new URL(this.targetUrl);
    } catch {
      throw new Error('Target must be a valid URL!');
    }
  }

  resolve = async (): Promise<URL> => this.target;
}
