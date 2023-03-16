
import { GraphQLFileLoader } from "@graphql-tools/graphql-file-loader";
import { loadSchema } from "@graphql-tools/load";
import axios from "axios";
import { defaultFieldResolver, DocumentNode, graphql, GraphQLResolveInfo, GraphQLSchema, isListType, isNonNullType, isScalarType, print, Source } from "graphql";
import { GraphQLField, GraphQLOutputType } from "graphql/type/definition.js";
import { DataFactory, Parser, Quad, Store } from "n3";

import { Context } from "./context.js";
import { ShaclParserService } from "./shacl-parser.service.js";
import { RDFS } from "./vocab.js";

const { namedNode } = DataFactory;


type Requester <C = {}, E = unknown> =  <R, V>(doc: DocumentNode, vars?: V, options?: C) => Promise<R> | AsyncIterable<R>;


export class LegacySdxClient {
    private parser = new ShaclParserService();

    constructor(private podLocation: string) { }

    request: Requester<{}> = async <R, V>(doc: DocumentNode, vars?: V, options?: {}): Promise<R> => {
        const query = print(doc);
        const schema = await this.getSchema();
        // const schema = await loadSchema('.sdx/graphql/schema.graphqls', { loaders: [new GraphQLFileLoader()],  })
        
        // console.log(schema)


        console.log(query);
        console.log(vars);
        console.log(this.podLocation);

        const result = await graphql({
            source: query,
            variableValues: vars!,
            schema,
            fieldResolver: this.fieldResolver(this.podLocation)
        });
        console.log(result.errors)
        return result.data as R;
    };

    private async getSchema(): Promise<GraphQLSchema> {
        // FIXME: Temporary workaround: reparsing from SHACL, as not to loose directives info
        return await this.parser.parseSHACL('.sdx/shacl');
        // return new GraphQLSchema({});
    }

    async query<T>(query: string, location?: string): Promise<T> {
        const schema = await this.getSchema();
        const result = await graphql({
            source: query,
            schema,
            fieldResolver: this.fieldResolver(location ?? this.podLocation)
        });
        return result.data as T;
    }

    private fieldResolver = <TArgs>(location: string) => async (source: Quad[], args: TArgs, context: Context, info: GraphQLResolveInfo): Promise<unknown> => {
        const { returnType, schema, fieldName, parentType, fieldNodes, path, rootValue } = info;
        const rootTypes = [
            schema.getQueryType()?.name,
            schema.getMutationType()?.name,
            schema.getSubscriptionType()?.name,
        ].filter(t => !!t);

        if (rootTypes.includes(parentType.name)) {
            const className = getDirectives(returnType).is['class'] as string;
            source = await getGraph(location).then(quads => getSubGraph(quads, className, args as any));
        }
        // Array
        if (isListType(returnType)) {
            // console.log(`--ARRAY found`, fieldName)
            // Scalar
            if (isScalarType(returnType.ofType) || (isNonNullType(returnType.ofType) && isScalarType(returnType.ofType.ofType))) {
                // Enclosing type quads
                const store = new Store(source || []);
                const id = getIdentifier(store, parentType);

                // Parse based on directives
                const field = parentType.getFields()[fieldName]!;
                const directives = getDirectives(field);

                if (directives.property) {
                    // console.log('--PROP DIRECTIVE found', fieldName);
                    const { iri } = directives.property;
                    return getProperties(store, id, iri);
                }
                else {
                    console.log('>>>>>>> SHOULD NOT HAPPEN <<<<<<<<')
                    return defaultFieldResolver(source, args, context, info);
                }
            }
            // Object
            else {
                const className = getDirectives(returnType).is['class'] as string;
                return getSubGraphArray(source, className, {});
            }
        } else {
            // Scalar
            if (isScalarType(returnType) || (isNonNullType(returnType) && isScalarType(returnType.ofType))) {
                // console.log('--SCALAR found', fieldName);
                // Enclosing type quads
                const store = new Store(source || []);
                const id = getIdentifier(store, parentType);
                // printQuads(store)

                // Parse based on directives
                const field = parentType.getFields()[fieldName]!;
                const directives = getDirectives(field);

                if (directives.identifier) {
                    // console.log('--IDENT DIRECTIVE found', fieldName, id);
                    return id;
                }
                else if (directives.property) {
                    // console.log('--PROP DIRECTIVE found', fieldName);
                    const { iri } = directives.property;
                    return getProperty(store, id, iri);
                }
                else {
                    console.log('>>>>>>> SHOULD NOT HAPPEN <<<<<<<<')
                    return defaultFieldResolver(source, args, context, info);
                }
            }
            // Object type
            else {
                // console.log('NON scalar')
                // console.log('--TYPE found', returnType.toString());
                // const type = schema.getType(returnType.toString())! as GraphQLOutputType;
                const className = getDirectives(returnType).is['class'] as string;
                return getSubGraph(source, className, {});

            }
        }
    };

}

async function getSubGraphArray(source: Quad[], className: string, args: Record<string, any>): Promise<Quad[][]> {
    const store = new Store(source);
    // TODO: generate subgraphs based on sub in [sub ?className ? ?]
    const quadsOfQuads = store
        .getSubjects(RDFS.a, namedNode(className), null)
        .map(async sub => await getSubGraph(source, className, { id: sub.value }));
    return Promise.all(quadsOfQuads);

}

async function getSubGraph(source: Quad[], className: string, args: Record<string, any>): Promise<Quad[]> {
    const store = new Store(source);

    // TODO: only id filter support
    const id = args?.id;
    console.log(args)
    // if (id) { console.log('ARG ID:', id); };
    // printQuads(store);
    let topQuads = store.getSubjects(RDFS.a, namedNode(className), null).flatMap(sub => store.getQuads(sub, null, null, null));
    // printQuads(topQuads, 'TOP')
    if (id) {
        topQuads = topQuads.filter(quad => quad.subject.value === id);
    }
    // printQuads(source, 'OUTSIDE STORE');
    const follow = (quads: Quad[], store: Store): Quad[] => {
        return quads.reduce((acc, quad) => (quad.object.termType === 'BlankNode' || quad.object.termType === 'NamedNode')
            ? [...acc, quad, ...follow(store.getQuads(quad.object, null, null, null), store)]
            : [...acc, quad],
            [] as Quad[]);
    }
    return follow(topQuads, store);


    // TODO:
    // get all quads (filtered by shape AND optional identifier)
    // for $obj === NamedNode | BlankBode (A)
    // Get all quads with $obj as subject (repeat A)
}

async function getGraph(location: string): Promise<Quad[]> {
    const doc = await axios.get(location);
    console.log(doc.data)
    return new Parser().parse(doc.data);
}

function getIdentifier(store: Store, type: GraphQLOutputType): string {
    const className = getDirectives(type).is['class'];
    return store.getSubjects(RDFS.a, namedNode(className), null).at(0)!.value;
}

function getProperty(store: Store, subject: string, predicate: string): string {
    return store.getObjects(namedNode(subject), namedNode(predicate), null).at(0)!.value;
}

function getProperties(store: Store, subject: string, predicate: string): string[] {
    return store.getObjects(namedNode(subject), namedNode(predicate), null).map(obj => obj.value);
}


function getDirectives(type: GraphQLOutputType | GraphQLField<any, any, any>): Record<string, any> {
    if (isListType(type)) {
        return getDirectives(type.ofType);
    }
    return isScalarType(type) ? {} : type.extensions.directives ?? {};
}



// // function followBlankNodes(store: Store, blankNode: BlankNode): Quad[] {
// //     return store.getQuads(blankNode, null, null, null).flatMap(quad => quad.object.termType === 'BlankNode');
// // }
// function findTypeInSchema(schema: GraphQLSchema, type: GraphQLOutputType): GraphQLOutputType {
//     const type = schema.getType(typeName);
//     if (!type || !isOutputType(type)) {
//         throw new Error(`${typeName} is not a valid GraphQLOutputType for this schema.`);
//     }
//     return type;
// }
