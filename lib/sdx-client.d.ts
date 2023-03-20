import * as graphql_jsutils_ObjMap_js from 'graphql/jsutils/ObjMap.js';
import { DocumentNode, ExecutionResult } from 'graphql';

declare function legacyRequester(podLocation: string): <R, V>(doc: DocumentNode, vars?: V | undefined, options?: {}) => Promise<ExecutionResult<R, graphql_jsutils_ObjMap_js.ObjMap<unknown>>>;

export { legacyRequester };
