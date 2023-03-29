import { GraphQLType, GraphQLObjectType, GraphQLInputObjectType } from 'graphql';
import { Quad, Store } from 'n3';

declare class PropertyShape {
    quads: Quad[];
    private context;
    name: string;
    description?: string;
    type?: GraphQLType;
    path?: string;
    minCount?: number;
    maxCount?: number;
    private className?;
    constructor(quads: Quad[], context: Context);
    private parseObject;
    private parseType;
    private parseClass;
    private dataTypeToGraphQLType;
    private findMatchingShapeType;
    get class(): () => GraphQLObjectType | undefined;
}

declare class Shape {
    quads: Quad[];
    name: string;
    targetClass?: string;
    propertyShapes: PropertyShape[];
    /**
     * Parse relevant quads to Shapes
     * @param quads The quads that make up the Shape
     * @param context Any toplevel quads that have a BlankNode subject
     */
    constructor(quads: Quad[], context: Context);
    private parseName;
    private parseObject;
    private parsePropertyShapes;
}

declare class Context {
    private store;
    private shapes;
    private types;
    private blankNodes;
    private inputTypes;
    /**
     * Context object for conversion from SHACL to GraphQL Schema
     * @param quads All quads
     * @param objectTypeConverter A function (closure) that converts a Shape into a GraphQLObjectType
     */
    constructor(quads: Quad[], objectTypeConverter: (shape: Shape) => GraphQLObjectType);
    /**
     * A store with all quads.
     * @returns
     */
    getStore(): Store;
    getShapes(): Shape[];
    getGraphQLObjectTypes(): GraphQLObjectType[];
    getBlankNodes(): Quad[];
    getInputTypes(): GraphQLInputObjectType[];
    private extractShapes;
    private extractTypes;
    private extractBlankNodes;
}

export { Context as C, PropertyShape as P, Shape as S };
