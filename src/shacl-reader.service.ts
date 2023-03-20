import axios from 'axios';
import { DirectiveLocation, GraphQLDirective, GraphQLFieldConfig, GraphQLID, GraphQLList, GraphQLNonNull, GraphQLObjectType, GraphQLObjectTypeConfig, GraphQLSchema, GraphQLString, GraphQLType } from "graphql";
import { DataFactory, Parser, Quad } from 'n3';
import { autoInjectable, singleton } from "tsyringe";
import { Context } from './context.js';
import { PropertyShape } from "./model/property-shape.js";
import { Shape } from "./model/shape.js";

const { namedNode } = DataFactory;

const ID_FIELD: { 'id': GraphQLFieldConfig<any, any> } = {
    id: {
        description: 'Auto-generated property that will be assigned to the `iri` of the Thing that is being queried.',
        type: new GraphQLNonNull(GraphQLID),
        extensions: {
            directives: {
                'identifier': {}
            }
        }
    }
} as const;

const IDENTIFIER_DIRECTIVE = new GraphQLDirective({
    name: 'identifier',
    locations: [DirectiveLocation.FIELD_DEFINITION]
})

const IS_DIRECTIVE = new GraphQLDirective({
    name: 'is',
    args: { class: { type: GraphQLString } },
    locations: [DirectiveLocation.OBJECT],

});

const PROPERTY_DIRECTIVE = new GraphQLDirective({
    name: 'property',
    args: { iri: { type: GraphQLString } },
    locations: [DirectiveLocation.FIELD_DEFINITION]
})

@singleton()
@autoInjectable()
export class ShaclReaderService {
    private parser: Parser;
    private _cache: Quad[] = [];
    primed = false;

    constructor() {
        this.parser = new Parser({ format: 'turtle' });
    }



    async primeCache(uri: string) {
        const response = await axios.get<{ entries: string[] }>(uri + '/index.json');
        this._cache = [];
        for (let entry of response.data.entries) {
            const txt = await axios.get(uri + '/' + entry);
            this._cache.push(...this.parser.parse(txt.data));
        }
        this.primed = true;
    }


    async parseSHACLs(uri: string): Promise<GraphQLSchema> {
        // const response = await axios.get<{ entries: string[] }>(uri + '/index.json');
        // const quads: Quad[] = [];
        // for (let entry of response.data.entries) {
        //     const txt = await axios.get(uri + '/' + entry);
        //     quads.push(...this.parser.parse(txt.data));
        // }
        

        const context = new Context(this._cache, this.generateObjectType);

        // Generate Schema
        return new GraphQLSchema({
            query: this.generateEntryPoints(context.getGraphQLObjectTypes()),
            directives: [IS_DIRECTIVE, PROPERTY_DIRECTIVE, IDENTIFIER_DIRECTIVE],
        });
    }

    /**
     * Generates the entry points for the GraphQL Query schema
     * @param types 
     * @returns 
     */
    private generateEntryPoints(types: GraphQLObjectType[]): GraphQLObjectType {
        const decapitalize = (str: string): string => str.slice(0, 1).toLowerCase() + str.slice(1);
        const plural = (str: string): string => `${str}Collection`;
        const query = new GraphQLObjectType({
            name: 'RootQueryType',
            fields: types.reduce((prev, type) => ({
                ...prev,
                // Singular type
                [decapitalize(type.name)]: {
                    type,
                    args: { id: { type: GraphQLString } }
                },
                // Multiple types
                [plural(decapitalize(type.name))]: {
                    type: new GraphQLList(type)
                }
            }), {})
        } as GraphQLObjectTypeConfig<any, any>);

        return query;

    }

    /**
     * Generates a GraphQLObjectType from a Shape
     * @param shape 
     * @returns 
     */
    private generateObjectType(shape: Shape): GraphQLObjectType {
        const applyMinMaxCount = (propertyShape: PropertyShape, type: GraphQLType): GraphQLList<GraphQLType> | GraphQLNonNull<GraphQLType> | GraphQLType => {
            let result: GraphQLList<GraphQLType> | GraphQLNonNull<GraphQLType> | GraphQLType = type;
            // collection
            if (!propertyShape.maxCount || (propertyShape.maxCount && propertyShape.maxCount > 1)) {
                result = new GraphQLList(result);
            }
            if (propertyShape.minCount && propertyShape.minCount > 0) {
                result = new GraphQLNonNull(result)
            }
            return result;
        };
        const props = () => shape.propertyShapes.reduce((prev: { [key: string]: GraphQLFieldConfig<any, any> }, prop: PropertyShape) => {
            const propType = prop.type ?? prop.class();
            if (!propType) { return prev }
            else {
                return {
                    ...prev,
                    [prop.name]: {
                        type: applyMinMaxCount(prop, propType!),
                        description: prop.description,
                        extensions: {
                            directives: {
                                property: { iri: prop.path }
                            }
                        }
                    } as GraphQLFieldConfig<any, any>
                }
            }
        }, ID_FIELD);
        return new GraphQLObjectType({
            name: shape.name,
            fields: props,
            extensions: {
                directives: {
                    is: { class: shape.targetClass }
                }
            },
        });
    }
}

const enum ERROR {
    NO_SHACL_SCHEMAS = `No shacl schema's`
}
