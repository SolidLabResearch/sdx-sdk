import { Quad, Store, Term } from 'n3';

export class Graph {
  private store: Store;

  constructor(quads: Quad[] = []) {
    this.store = new Store(quads);
  }

  /**
   * Find all quads matching the query
   * @returns Array of Quads
   */
  find(
    subject: Term | null,
    predicate: Term | null,
    object: Term | null
  ): Quad[] {
    return this.store.getQuads(subject, predicate, object, null);
  }

  getQuads(): Quad[] {
    return this.store.getQuads(null, null, null, null);
  }

  add(...quads: Quad[]): Graph {
    this.store.addQuads(quads);
    return this;
  }

  remove(...quads: Quad[]): Graph {
    this.store.removeQuads(quads);
    return this;
  }

  addGraph(graph: Graph): Graph {
    this.store.addQuads(graph.getQuads());
    return this;
  }
}
