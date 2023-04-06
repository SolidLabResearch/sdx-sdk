import { GraphQLOutputType, GraphQLResolveInfo, defaultFieldResolver, isListType, isNonNullType, isScalarType } from "graphql";
import { DataFactory, Store } from "n3";
import { LdpClient, vocab } from "../../../../commons";
import { SolidLDPContext } from "../solid-ldp-backend";
import { TargetResolverContext } from "../target-resolvers";
import { IntermediateResult, getDirectives, getGraph, getSubGraph, getSubGraphArray } from "./utils";

const { namedNode } = DataFactory;

export class QueryHandler {
    constructor(private ldpClient: LdpClient) {

    }

    async handleQuery<TArgs>(source: IntermediateResult, args: TArgs, context: SolidLDPContext, info: GraphQLResolveInfo, rootTypes: string[]): Promise<IntermediateResult | unknown> {
        const { returnType, schema, fieldName, parentType, fieldNodes, path, rootValue, operation } = info;
        if (rootTypes.includes(parentType.name)) {
            const className = getDirectives(returnType).is['class'] as string;
            const targetUrl = await context.resolver.resolve(className, new TargetResolverContext(this.ldpClient))
            source.quads = await getGraph(targetUrl.toString()).then(quads => getSubGraph(quads, className, args as any));
        }
        // Array
        if (isListType(returnType) || (isNonNullType(returnType) && isListType(returnType.ofType))) {
            // Scalar
            if (isScalarType(returnType.ofType) || (isNonNullType(returnType.ofType) && isScalarType(returnType.ofType.ofType))) {
                // Enclosing type quads
                const store = new Store(source.quads || []);
                const id = this.getIdentifier(store, parentType);

                // Parse based on directives
                const field = parentType.getFields()[fieldName]!;
                const directives = getDirectives(field);

                if (directives.property) {
                    // console.log('--PROP DIRECTIVE found', fieldName);
                    const { iri } = directives.property;
                    return this.getProperties(store, id, iri);
                }
                else {
                    console.log('>>>>>>> SHOULD NOT HAPPEN <<<<<<<<')
                    return defaultFieldResolver(source, args, context, info);
                }
            }
            // Object
            else {
                const className = getDirectives(returnType).is['class'] as string;
                return (await getSubGraphArray(source.quads!, className, {})).map(quads => ({ ...source, quads }));
            }
            // Single value
        } else {
            // Scalar
            if (isScalarType(returnType) || (isNonNullType(returnType) && isScalarType(returnType.ofType))) {
                const actualReturnType = isNonNullType(returnType) ? returnType.ofType : returnType;
                // Enclosing type quads
                const store = new Store(source.quads || []);
                const id = this.getIdentifier(store, parentType);
                // printQuads(store)

                // Parse based on directives
                const field = parentType.getFields()[fieldName]!;
                const directives = getDirectives(field);

                if (directives.identifier || actualReturnType.toString() === 'ID') {
                    // console.log('--IDENT DIRECTIVE found', fieldName, id);
                    return id;
                }
                else if (directives.property) {
                    // console.log('--PROP DIRECTIVE found', fieldName);
                    const { iri } = directives.property;
                    return this.getProperty(store, id, iri);
                }
                else {
                    console.log('>>>>>>> SHOULD NOT HAPPEN <<<<<<<<')
                    return defaultFieldResolver(source, args, context, info);
                }
            }
            // Object type
            else {
                const className = getDirectives(returnType).is['class'] as string;
                source.quads = await getSubGraph(source.quads!, className, {});
                source.parentClassIri = className;
                return source;

            }
        }
    }

    private getIdentifier(store: Store, type: GraphQLOutputType): string {
        const className = getDirectives(type).is['class'];
        return store.getSubjects(vocab.RDFS.a, namedNode(className), null).at(0)!.value;
    }

    private getProperty(store: Store, subject: string, predicate: string): string {
        return store.getObjects(namedNode(subject), namedNode(predicate), null).at(0)!.value;
    }

    private getProperties(store: Store, subject: string, predicate: string): string[] {
        return store.getObjects(namedNode(subject), namedNode(predicate), null).map(obj => obj.value);
    }

}
