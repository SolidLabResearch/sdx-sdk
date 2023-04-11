import { GraphQLInputObjectType, GraphQLObjectType } from 'graphql';
import { Quad, Store } from 'n3';
import { Shape } from './model';
import { utils, vocab } from '../commons';

export class Context {
  private store: Store;
  private shapes: Shape[];
  private types: GraphQLObjectType[];
  private blankNodes: Quad[];
  private inputTypes: GraphQLInputObjectType[] = [];

  /**
   * Context object for conversion from SHACL to GraphQL Schema
   * @param quads All quads
   * @param objectTypeConverter A function (closure) that converts a Shape into a GraphQLObjectType
   */
  constructor(
    quads: Quad[],
    objectTypeConverter: (shape: Shape) => GraphQLObjectType
  ) {
    this.store = new Store(quads);
    this.blankNodes = this.extractBlankNodes(quads);
    this.shapes = this.extractShapes(this.store);
    this.types = this.extractTypes(this.shapes, objectTypeConverter);
  }

  /**
   * A store with all quads.
   * @returns
   */
  getStore(): Store {
    return this.store;
  }

  getShapes(): Shape[] {
    return this.shapes;
  }

  getGraphQLObjectTypes(): GraphQLObjectType[] {
    return this.types;
  }

  getBlankNodes(): Quad[] {
    return this.blankNodes;
  }

  getInputTypes(): GraphQLInputObjectType[] {
    return this.inputTypes;
  }

  private extractShapes(store: Store): Shape[] {
    const shapes: Shape[] = [];
    const quads: Quad[] = store
      .getSubjects(vocab.RDFS.a, vocab.SHACL.NodeShape, null)
      .flatMap((sub) => store.getQuads(sub, null, null, null));
    for (const entry of utils.groupBySubject(quads).entries()) {
      shapes.push(new Shape(entry[1], this));
    }
    return shapes;
  }

  private extractTypes(
    shapes: Shape[],
    objectTypeConverter: (shape: Shape) => GraphQLObjectType
  ): GraphQLObjectType[] {
    return shapes.map(objectTypeConverter);
  }

  private extractBlankNodes(quads: Quad[]): Quad[] {
    return quads.filter((quad) => quad.subject.termType === 'BlankNode');
  }
}
