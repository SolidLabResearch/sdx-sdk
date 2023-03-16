import { DocumentNode, GraphQLSchema } from "graphql";
// import { TEST_COMPLEX_SHACL_FILE_PATH, TEST_SHACL_FILE_PATH } from "../constants.js";
// import { ShaclParserService } from "../services/shacl-parser.service.js";
import { LegacySdxClient } from "./legacy-sdx-client.js";
import { ShaclParserService } from "./shacl-parser.service.js";

export class SdxClient {
    legacyClient: LegacySdxClient;
    constructor() {
        this.legacyClient = new LegacySdxClient('http://localhost:3000/complex.ttl');
    }

    async query<T>(query: string, documentLocation?: string): Promise<T> {
           
        return this.legacyClient.query<T>(query, documentLocation);
    }

    async mutation(mutation: string): Promise<void> {
        throw new Error("Method not implemented.");
    }

}
