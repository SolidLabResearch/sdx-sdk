import { GraphQLScalarType, GraphQLObjectType, GraphQLInputObjectType, GraphQLOutputType, GraphQLInterfaceType, GraphQLUnionType, GraphQLEnumType } from 'graphql';
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

export { capitalize, decapitalize, groupBySubject, isOrContainsInputObjectType, isOrContainsObjectType, isOrContainsScalar, parseNameFromUri, plural, printQuads, toActualType };
