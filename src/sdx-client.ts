import { DocumentNode, ExecutionResult, graphql, print } from "graphql";
import { URI_SDX_GENERATE_SHACL_FOLDER } from "./constants.js";
import * as legacy from "./legacy-sdx-client.js";
import { ShaclReaderService } from "./shacl-reader.service.js";

const parser = new ShaclReaderService();

export function legacyRequester(podLocation: string) {
    return async <R, V>(doc: DocumentNode, vars?: V, options?: {}): Promise<ExecutionResult<R>> => {
        const query = print(doc);
        if (!parser.primed) {
            await parser.primeCache(URI_SDX_GENERATE_SHACL_FOLDER);
        }
        const schema = await parser.parseSHACLs(URI_SDX_GENERATE_SHACL_FOLDER);

        console.log(query);
        console.log(vars);


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
