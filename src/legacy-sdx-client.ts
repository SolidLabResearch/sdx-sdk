import axios from "axios";
import { defaultFieldResolver, GraphQLField, GraphQLInputField, GraphQLInputObjectType, GraphQLInputType, GraphQLObjectType, GraphQLOutputType, GraphQLResolveInfo, GraphQLType, isListType, isNonNullType, isScalarType } from "graphql";
import { DataFactory, Literal, NamedNode, Parser, Quad, Store } from "n3";
import { v4 as uuidv4 } from "uuid";
import { LdpClient } from "./commons/ldp/ldp-client.js";
import { ResourceType } from "./types.js";
import { unwrapNonNull } from "./util.js";
import { RDFS } from "./vocab.js";
import { SolidLDPContext } from "./index.js";
import { TargetResolverContext } from "./backends/ldp/target-resolvers.js";

const { namedNode, quad, literal } = DataFactory;

const ID_FIELD = "id";
const SLUG_FIELD = "slug";

export interface IntermediateResult {
    quads: Quad[];
    parentClassIri?: string;
    resourceType: ResourceType;
    subject?: NamedNode;
}

/**
 * Field resolver for legacy PODs.
 * @param location Location of the root graph.
 * @returns 
 */
export function fieldResolver<TArgs>(ldpClient: LdpClient) {

    return async (source: IntermediateResult, args: TArgs, context: SolidLDPContext, info: GraphQLResolveInfo): Promise<unknown> => {
        const { returnType, schema, fieldName, parentType, fieldNodes, path, rootValue, operation } = info;
        // setup intermediate result
        if (!source) {
            source = {
                quads: [],
                resourceType: ResourceType.DOCUMENT
            }
        }

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

    async function handleQuery(source: IntermediateResult, args: TArgs, context: SolidLDPContext, info: GraphQLResolveInfo, rootTypes: string[]): Promise<IntermediateResult | unknown> {
        // console.log('query', source)
        const { returnType, schema, fieldName, parentType, fieldNodes, path, rootValue, operation } = info;
        if (rootTypes.includes(parentType.name)) {
            const className = getDirectives(returnType).is['class'] as string;
            const targetUrl = await context.resolver.resolve(className, new TargetResolverContext(ldpClient))
            source.quads = await getGraph(targetUrl.toString()).then(quads => getSubGraph(quads, className, args as any));
        }
        // Array
        if (isListType(returnType)) {
            // Scalar
            if (isScalarType(returnType.ofType) || (isNonNullType(returnType.ofType) && isScalarType(returnType.ofType.ofType))) {
                // Enclosing type quads
                const store = new Store(source.quads || []);
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
                return (await getSubGraphArray(source.quads!, className, {})).map(quads => ({ ...source, quads }));
            }
        } else {
            // Scalar
            if (isScalarType(returnType) || (isNonNullType(returnType) && isScalarType(returnType.ofType))) {
                // Enclosing type quads
                const store = new Store(source.quads || []);
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
                // const type = schema.getType(returnType.toString())! as GraphQLOutputType;

                const className = getDirectives(returnType).is['class'] as string;
                source.quads = await getSubGraph(source.quads!, className, {});
                source.parentClassIri = className;
                return source;

            }
        }
    }


    async function handleMutation(source: IntermediateResult, args: TArgs, context: SolidLDPContext, info: GraphQLResolveInfo, rootTypes: string[]): Promise<unknown> {
        const { returnType, schema, fieldName, parentType, fieldNodes, path, rootValue, operation } = info;
        if (rootTypes.includes(parentType.name)) {
            const className = getDirectives(returnType).is['class'] as string;
            const targetUrl = await context.resolver.resolve(className, new TargetResolverContext(ldpClient))
            const graph = await getGraph(targetUrl.toString());
            source.quads = await getSubGraph(graph, className, args as any);
        }
        if (fieldName === "delete") return handleDeleteMutation(source, args, context, info);
        if (fieldName === "update") return handleUpdateMutation(source, args, context, info);
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


    async function handleCreateMutation(source: IntermediateResult, args: TArgs, context: SolidLDPContext, info: GraphQLResolveInfo, rootTypes: string[]): Promise<IntermediateResult> {
        console.log('create', source);
        const className = getDirectives(info.returnType).is['class'];
        const targetUrl = await context.resolver.resolve(className, new TargetResolverContext(ldpClient))
        // Create mutations should always have an input argument.
        const input = (args as any).input;
        source.subject = namedNode(getNewInstanceID(input, source.resourceType!));
        const inputType = info.parentType.getFields()[info.fieldName]!.args.find(arg => arg.name === "input")!.type;
        source.quads = generateTriplesForInput(source.subject, input, unwrapNonNull(inputType) as GraphQLInputObjectType, namedNode(className));
        switch (source.resourceType!) {
            case ResourceType.DOCUMENT:
                // Append triples to doc using patch
                await new LdpClient().patchDocument(targetUrl.toString(), source.quads);
        }
        return source;
    }

    async function handleGetMutateObjectType(source: IntermediateResult, args: TArgs, context: SolidLDPContext, info: GraphQLResolveInfo, rootTypes: string[]): Promise<IntermediateResult> {
        const className = getDirectives(info.returnType).is['class'];
        const targetUrl = await context.resolver.resolve(className, new TargetResolverContext(ldpClient))

        console.log(source);
        if (targetUrl.toString()) {
            source.subject = namedNode((args as any).id);
            source.quads = await getSubGraph(source.quads!, className, args as any);
            source.parentClassIri = className;
            return source;
        } else {
            throw new Error("A target URL for this request could not be resolved!")
        }
    }

    async function handleDeleteMutation(source: IntermediateResult, args: TArgs, context: SolidLDPContext, info: GraphQLResolveInfo): Promise<IntermediateResult> {
        console.log('DELETE MUTATION');
        const targetUrl = await context.resolver.resolve(source.parentClassIri!, new TargetResolverContext(ldpClient))
        switch (source.resourceType!) {
            case ResourceType.DOCUMENT:
                // Append triples to doc using patch
                await new LdpClient().patchDocument(targetUrl.toString(), null, source.quads);
        }
        return source;

    }

    async function handleUpdateMutation(source: IntermediateResult, args: TArgs, context: SolidLDPContext, info: GraphQLResolveInfo): Promise<IntermediateResult> {
        const returnType = info.schema.getType(unwrapNonNull(info.returnType).toString()) as GraphQLObjectType;
        const targetUrl = await context.resolver.resolve(source.parentClassIri!, new TargetResolverContext(ldpClient))
        const input = (args as any).input;
        const { inserts, deletes } = generateTriplesForUpdate(source.quads!, input, source.subject!, returnType);
        switch (source.resourceType!) {
            case ResourceType.DOCUMENT:
                // Update triples in doc using patch
                await new LdpClient().patchDocument(targetUrl.toString(), inserts, deletes);
        }
        // Reconstruct object
        const store = new Store(source.quads);
        store.removeQuads(deletes);
        store.addQuads(inserts);
        source.quads = store.getQuads(null, null, null, null);
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

function generateTriplesForUpdate(source: Quad[], input: Record<string, any>, subject: NamedNode, objectTypeDefinition: GraphQLObjectType): { inserts: Quad[], deletes: Quad[] } {
    const store = new Store(source);
    const inserts: Quad[] = [];
    const deletes: Quad[] = [];

    Object.entries(input).forEach(([fieldName, value]) => {
        const fieldDef = objectTypeDefinition.getFields()[fieldName]!;
        const propertyIri = getDirectives(fieldDef).property['iri'];

        // Throw error if value is null and type was nonnull
        if (value == null) {
            if (isNonNullType(fieldDef.type)) {
                throw new Error(`Update input provided null value for non-nullable field '${fieldName}'`);
            }
            // Add quad to deletes, because it was set explicitly set to null
            deletes.push(...store.getQuads(subject, namedNode(propertyIri), null, null));
        } else {
            // Remove and then insert quads, to perform upgrade
            deletes.push(...store.getQuads(subject, namedNode(propertyIri), null, null));
            if (isListType(fieldDef.type)) {
                inserts.push(...value.map((v: any) => quad(subject, namedNode(propertyIri), literal(v))));
            } else {
                inserts.push(quad(subject, namedNode(propertyIri), literal(value)));
            }
        }
    });
    return { inserts, deletes };
}
