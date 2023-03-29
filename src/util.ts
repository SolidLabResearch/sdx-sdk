import { GraphQLEnumType, GraphQLInputObjectType, GraphQLInterfaceType, GraphQLNonNull, GraphQLNullableType, GraphQLObjectType, GraphQLOutputType, GraphQLScalarType, GraphQLType, GraphQLUnionType, isListType, isNonNullType, isObjectType, isScalarType } from "graphql";
import { Quad, Quad_Subject, Store } from "n3";

export function parseNameFromUri(uriString: string): string {
    const uri = new URL(uriString);
    // If the URI has a fragment, use fragment, otherwise use the last path segment
    return uri.hash.length > 0 ? uri.hash.slice(1) : uri.pathname.slice(uri.pathname.lastIndexOf('/') + 1);
}

export function groupBySubject(quads: Quad[]): Map<Quad_Subject, Quad[]> {
    return quads.reduce((index, quad) => {
        if (index.has(quad.subject)) {
            index.get(quad.subject)!.push(quad)
        } else {
            index.set(quad.subject, [quad]);
        }
        return index;
    }, new Map<Quad_Subject, Quad[]>());
}

export function printQuads(quads: Quad[] | Store, label?: string) {
    if (label) {
        console.log(`${label} ==> `)
    }
    let q = (quads) instanceof Array ? quads : quads.getQuads(null, null, null, null);
    q.forEach(q => console.log(`[${q.subject.value} ${q.predicate.value} ${q.object.value}]`));
}

export const capitalize = (str: string): string => str.slice(0, 1).toUpperCase() + str.slice(1);
export const decapitalize = (str: string): string => str.slice(0, 1).toLowerCase() + str.slice(1);
export const plural = (str: string): string => `${str}Collection`;


export const isOrContainsScalar = (type: unknown): type is GraphQLScalarType<unknown, unknown> => isScalarType(type)
    || (isNonNullType(type) && isOrContainsScalar(type.ofType))
    || (isListType(type) && isOrContainsScalar(type.ofType));

export const isOrContainsObjectType = (type: unknown): type is GraphQLObjectType<any, any> => isObjectType(type)
    || (isNonNullType(type) && isOrContainsObjectType(type.ofType))
    || (isListType(type) && isOrContainsObjectType(type.ofType));

    export const isOrContainsInputObjectType = (type: unknown): type is GraphQLInputObjectType => isObjectType(type)
    || (isNonNullType(type) && isOrContainsInputObjectType(type.ofType))
    || (isListType(type) && isOrContainsInputObjectType(type.ofType));

export const toActualType = (type: GraphQLOutputType): GraphQLObjectType | GraphQLScalarType<unknown, unknown> | GraphQLInterfaceType | GraphQLUnionType | GraphQLEnumType => {
    return isListType(type) ? toActualType(type.ofType)
        : isNonNullType(type) ? toActualType(type.ofType)
            : isObjectType(type) ? type
                : type
}

export const unwrapNonNull= (type: GraphQLType): GraphQLType => isNonNullType(type) ? type.ofType : type;
