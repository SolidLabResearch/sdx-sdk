import { AxiosResponse } from 'axios';
import { Quad } from 'n3';
import { SolidClientCredentials } from '../auth/solid-client-credentials.js';

declare class LdpClient {
    private clientCredentials?;
    constructor(clientCredentials?: SolidClientCredentials);
    patchDocument(url: string, inserts?: Quad[] | null, deletes?: Quad[] | null): Promise<AxiosResponse>;
}

export { LdpClient };
