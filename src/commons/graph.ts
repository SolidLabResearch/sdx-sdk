import { NamedNode, Quad, Store, Term } from 'n3';
import { RDFS } from './vocab';

export class Graph {
  private store: Store;

  constructor(quads: Quad[]) {
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
}
