import axios from "axios";
import { defaultFieldResolver, GraphQLField, GraphQLInputField, GraphQLInputObjectType, GraphQLInputType, GraphQLOutputType, GraphQLResolveInfo, GraphQLType, isListType, isNonNullType, isScalarType } from "graphql";
import { DataFactory, Literal, NamedNode, Parser, Quad, Store } from "n3";
import { v4 as uuidv4 } from "uuid";

import { Context } from "./context.js";
import { LdpClient } from "./ldp-client.js";
import { ResourceType } from "./types.js";
import { unwrapNonNull } from "./util.js";
import { RDFS } from "./vocab.js";

const { namedNode, quad, literal } = DataFactory;

const ID_FIELD = "id";
const SLUG_FIELD = "slug";

/**
 * Field resolver for legacy PODs.
 * @param location Location of the root graph.
 * @returns 
 */
export function fieldResolver<TArgs>(location: string) {
    return async (source: Quad[], args: TArgs, context: Context, info: GraphQLResolveInfo): Promise<unknown> => {
        const { returnType, schema, fieldName, parentType, fieldNodes, path, rootValue, operation } = info;
        // console.log('OP: ', operation);
        const rootTypes = [
            schema.getQueryType()?.name,
            schema.getMutationType()?.name,
            schema.getSubscriptionType()?.name,
        ].filter(t => !!t) as string[];

        if ('query' === operation.operation) {
            return handleQuery(source, args, context, info, rootTypes);
        }
        if ('mutation' === operation.operation) {
            return handleMutation(source, args, context, info, rootTypes);
        }



    };


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
        const id = args?.id;
        let topQuads = store.getSubjects(RDFS.a, namedNode(className), null).flatMap(sub => store.getQuads(sub, null, null, null));
        if (id) {
            topQuads = topQuads.filter(quad => quad.subject.value === id);
        }
        const follow = (quads: Quad[], store: Store): Quad[] => {
            return quads.reduce((acc, quad) => (quad.object.termType === 'BlankNode' || quad.object.termType === 'NamedNode')
                ? [...acc, quad, ...follow(store.getQuads(quad.object, null, null, null), store)]
                : [...acc, quad],
                [] as Quad[]);
        }
        return follow(topQuads, store);
    }

    async function getGraph(location: string): Promise<Quad[]> {
        const doc = await axios.get(location);
        // console.log(doc.data)
        return new Parser().parse(doc.data);
    }

    async function handleQuery(source: Quad[], args: TArgs, context: Context, info: GraphQLResolveInfo, rootTypes: string[]): Promise<unknown> {
        const { returnType, schema, fieldName, parentType, fieldNodes, path, rootValue, operation } = info;
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
                // Enclosing type quads
                const store = new Store(source || []);
                const id = getIdentifier(store, parentType);
                // printQuads(store)

                // Parse based on directives
                const field = parentType.getFields()[fieldName]!;
                const directives = getDirectives(field);

                if (directives.identifier || returnType.toString() === 'ID') {
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
                // const type = schema.getType(returnType.toString())! as GraphQLOutputType;

                const className = getDirectives(returnType).is['class'] as string;
                return getSubGraph(source, className, {});

            }
        }
    }


    async function handleMutation(source: Quad[], args: TArgs, context: Context, info: GraphQLResolveInfo, rootTypes: string[]): Promise<unknown> {
        const { returnType, schema, fieldName, parentType, fieldNodes, path, rootValue, operation } = info;
        if (rootTypes.includes(parentType.name)) {
            const className = getDirectives(returnType).is['class'] as string;
            source = await getGraph(location).then(quads => getSubGraph(quads, className, args as any));
        }
        if (fieldName === "delete") return handleDeleteMutation(source, args, context, info);
        if (fieldName === "update") return TODO();
        if (fieldName.startsWith("create")) return handleCreateMutation(source, args, context, info, rootTypes);
        if (fieldName.startsWith("mutate")) return handleGetMutateObjectType(source, args, context, info, rootTypes);
        if (fieldName.startsWith("set")) return TODO();
        if (fieldName.startsWith("clear")) return TODO();
        if (fieldName.startsWith("add")) return TODO();
        if (fieldName.startsWith("remove")) return TODO();
        if (fieldName.startsWith("link")) return TODO();
        if (fieldName.startsWith("unlink")) return TODO();
        // It is a query for a return type
        return handleQuery(source, args, context, info, rootTypes);
    }


    async function handleCreateMutation(source: Quad[], args: TArgs, context: Context, info: GraphQLResolveInfo, rootTypes: string[]): Promise<unknown> {
        const classUri = getDirectives(info.returnType).is['class'];
        const targetUrl = location;
        // Create mutations should always have an input argument.
        const input = (args as any).input;
        console.log(classUri)
        console.log(input)
        console.log(targetUrl)
        const resourceType = ResourceType.DOCUMENT;//ldpClient.fetchResourceType(targetUrl)
        const id = getNewInstanceID(input, resourceType);
        const inputType = info.parentType.getFields()[info.fieldName]!.args.find(arg => arg.name === "input")!.type;
        const content = generateTriplesForInput(namedNode(id), input, unwrapNonNull(inputType) as GraphQLInputObjectType, namedNode(classUri));
        switch (resourceType) {
            case ResourceType.DOCUMENT:
                // Append triples to doc using patch
                await new LdpClient().patchDocument(targetUrl, content);
        }
        return content;
    }

    async function handleGetMutateObjectType(source: Quad[], args: TArgs, context: Context, info: GraphQLResolveInfo, rootTypes: string[]): Promise<unknown> {
        const classUri = getDirectives(info.returnType).is['class'];
        const targetUrl = location;

        if (targetUrl != null) {
            const resourceType = ResourceType.DOCUMENT;//ldpClient.fetchResourceType(targetUrl)
            const id = (args as any).id;
            return getSubGraph(source, classUri, { id });
        } else {
            throw new Error("A target URL for this request could not be resolved!")
        }
    }

    async function handleDeleteMutation(source: Quad[], args: TArgs, context: Context, info: GraphQLResolveInfo): Promise<Quad[]> {
        console.log('DELETE MUTATION');
        const resourceType = ResourceType.DOCUMENT;
        const targetUrl = location;
        switch (resourceType) {
            case ResourceType.DOCUMENT:
                // Append triples to doc using patch
                await new LdpClient().patchDocument(targetUrl, null, source);
        }
        return source;

    }
}

function TODO() {
    alert('TODO');
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


function getDirectives(type: GraphQLType | GraphQLField<any, any, any> | GraphQLInputField): Record<string, any> {
    if (isListType(type)) {
        return getDirectives(type.ofType);
    }
    if (isNonNullType(type)) {
        return getDirectives(type.ofType);
    }
    return isScalarType(type) ? {} : type.extensions.directives ?? {};
}

function getNewInstanceID(input: Record<string, any>, resourceType: ResourceType): string {
    switch (resourceType) {
        case ResourceType.CONTAINER: return '';
        case ResourceType.DOCUMENT: return input[ID_FIELD]?.toString() ?? `#${input[SLUG_FIELD]}` ?? uuidv4();
        default: return '';
    }
}

function generateTriplesForInput(subject: NamedNode, input: Record<string, any>, inputDefinition: GraphQLInputObjectType, classUri: NamedNode): Quad[] {
    const quads: Quad[] = [];
    quads.push(quad(subject, RDFS.a, classUri));
    return Object.values(inputDefinition.getFields())
        .filter(field => field.name !== "slug" && field.name !== "id")
        .reduce((acc, field) => {
            if (field.name in input) {
                acc.push(quad(subject, namedNode(getDirectives(field).property['iri']), literal(input[field.name])))
            }
            return acc;
        }, quads);
}
