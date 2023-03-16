import { LegacySdxClient } from './legacy-sdx-client.js';
import 'graphql';

declare class SdxClient {
    legacyClient: LegacySdxClient;
    constructor();
    query<T>(query: string, documentLocation?: string): Promise<T>;
    mutation(mutation: string): Promise<void>;
}

export { SdxClient };
