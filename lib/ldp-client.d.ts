import axios from 'axios';
import { Quad } from 'n3';

declare class LdpClient {
    patchDocument(url: string, inserts?: Quad[] | null, deletes?: Quad[] | null): Promise<axios.AxiosResponse<any, any>>;
}

export { LdpClient };
