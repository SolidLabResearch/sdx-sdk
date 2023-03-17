import { DocumentNode, print, graphql, ExecutionResult } from "graphql";
import Module from "module";
// import { TEST_COMPLEX_SHACL_FILE_PATH, TEST_SHACL_FILE_PATH } from "../constants.js";
// import { ShaclParserService } from "../services/shacl-parser.service.js";
import * as legacy from "./legacy-sdx-client.js";
import { ShaclParserService } from "./shacl-parser.service.js";

const parser = new ShaclParserService();

// export class SdxClient {
//     legacyClient: LegacySdxClient;
//     constructor() {
//         this.legacyClient = new LegacySdxClient('http://localhost:3000/complex.ttl');
//     }

//     async query<T>(query: string, documentLocation?: string): Promise<T> {

//         return this.legacyClient.query<T>(query, documentLocation);
//     }

//     async mutation(mutation: string): Promise<void> {
//         throw new Error("Method not implemented.");
//     }

// }

export async function dynamicSdkClient(file: string) {

        // const x = './sdk.generated.js';
        const generated = await import(file);
        const getSdk: typeof generated['getSdk'] = generated['getSdk'];
        return getSdk(legacyRequester('http://localhost:3000/complex.ttl')) as typeof generated.exports['getSdk'];
}


type Requester<C = {}, E = unknown> = <R, V>(doc: DocumentNode, vars?: V, options?: C) => Promise<R> | AsyncIterable<R>;

export function legacyRequester(podLocation: string) {
    return async <R, V>(doc: DocumentNode, vars?: V, options?: {}): Promise<ExecutionResult<R>> => {
        const query = print(doc);
        const schema = await parser.parseSHACL('.sdx/shacl');
        // const schema = await loadSchema('.sdx/graphql/schema.graphqls', { loaders: [new GraphQLFileLoader()],  })

        // console.log(schema)


        // console.log(query);
        // console.log(vars);
        // console.log(podLocation);

        const result = await graphql({
            source: query,
            variableValues: vars!,
            schema,
            fieldResolver: legacy.fieldResolver(podLocation)
        });
        // console.log(result.errors)
        return result as ExecutionResult<R>;
    };
}
