import { DocumentNode, ExecutionResult, graphql, print } from "graphql";
// import { TEST_COMPLEX_SHACL_FILE_PATH, TEST_SHACL_FILE_PATH } from "../constants.js";
// import { ShaclParserService } from "../services/shacl-parser.service.js";
import * as legacy from "./legacy-sdx-client.js";
import { ShaclReaderService } from "./shacl-reader.service.js";

const parser = new ShaclReaderService();

export function legacyRequester(podLocation: string) {
    return async <R, V>(doc: DocumentNode, vars?: V, options?: {}): Promise<ExecutionResult<R>> => {
        const query = print(doc);
        if (!parser.primed) {
            await parser.primeCache('.sdx/shacl');
        }
        const schema = await parser.parseSHACLs('.sdx/shacl');

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
