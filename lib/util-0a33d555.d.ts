import { GraphQLScalarType, GraphQLObjectType, GraphQLInputObjectType, GraphQLOutputType, GraphQLInterfaceType, GraphQLUnionType, GraphQLEnumType, GraphQLType } from 'graphql';
import { GraphQLInputType } from 'graphql/type/definition';
import { Quad, Quad_Subject, Store } from 'n3';

declare function parseNameFromUri(uriString: string): string;
declare function groupBySubject(quads: Quad[]): Map<Quad_Subject, Quad[]>;
declare function printQuads(quads: Quad[] | Store, label?: string): void;
declare const capitalize: (str: string) => string;
declare const decapitalize: (str: string) => string;
declare const plural: (str: string) => string;
declare const isOrContainsScalar: (type: unknown) => type is GraphQLScalarType<unknown, unknown>;
declare const isOrContainsObjectType: (type: unknown) => type is GraphQLObjectType<any, any>;
declare const isOrContainsInputObjectType: (type: unknown) => type is GraphQLInputObjectType;
declare const toActualType: (type: GraphQLOutputType) => GraphQLObjectType | GraphQLScalarType<unknown, unknown> | GraphQLInterfaceType | GraphQLUnionType | GraphQLEnumType;
declare const unwrapNonNull: (type: GraphQLType) => GraphQLType | GraphQLInputType | GraphQLOutputType;

declare const util_capitalize: typeof capitalize;
declare const util_decapitalize: typeof decapitalize;
declare const util_groupBySubject: typeof groupBySubject;
declare const util_isOrContainsInputObjectType: typeof isOrContainsInputObjectType;
declare const util_isOrContainsObjectType: typeof isOrContainsObjectType;
declare const util_isOrContainsScalar: typeof isOrContainsScalar;
declare const util_parseNameFromUri: typeof parseNameFromUri;
declare const util_plural: typeof plural;
declare const util_printQuads: typeof printQuads;
declare const util_toActualType: typeof toActualType;
declare const util_unwrapNonNull: typeof unwrapNonNull;
declare namespace util {
  export {
    util_capitalize as capitalize,
    util_decapitalize as decapitalize,
    util_groupBySubject as groupBySubject,
    util_isOrContainsInputObjectType as isOrContainsInputObjectType,
    util_isOrContainsObjectType as isOrContainsObjectType,
    util_isOrContainsScalar as isOrContainsScalar,
    util_parseNameFromUri as parseNameFromUri,
    util_plural as plural,
    util_printQuads as printQuads,
    util_toActualType as toActualType,
    util_unwrapNonNull as unwrapNonNull,
  };
}

export { printQuads as a, plural as b, capitalize as c, decapitalize as d, isOrContainsObjectType as e, isOrContainsInputObjectType as f, groupBySubject as g, unwrapNonNull as h, isOrContainsScalar as i, parseNameFromUri as p, toActualType as t, util as u };
