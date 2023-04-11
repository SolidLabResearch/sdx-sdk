import { NamedNode, Quad, Store } from 'n3';
import { Context } from '../context';
import { PropertyShape } from './property-shape';
import { utils, vocab } from '../../commons';

export class Shape {
  public name: string;
  public targetClass?: string;
  public propertyShapes: PropertyShape[];

  /**
   * Parse relevant quads to Shapes
   * @param quads The quads that make up the Shape
   * @param context Any toplevel quads that have a BlankNode subject
   */
  constructor(public quads: Quad[], context: Context) {
    // console.log(quads);
    // console.log(context)
    const store = new Store(quads);
    this.name = this.parseName(store);
    this.targetClass = this.parseObject(store, vocab.SHACL.targetClass);
    this.propertyShapes = this.parsePropertyShapes(store, context);
  }

  private parseName(store: Store): string {
    const sub = store.getSubjects(vocab.RDFS.a, vocab.SHACL.NodeShape, null);
    if (sub && sub.length === 1) {
      return utils.parseNameFromUri(sub.at(0)!.value);
    } else {
      throw new Error("There must be just one Subject for 'a' NodeShape.");
    }
  }

  private parseObject(
    store: Store,
    predicate: NamedNode,
    throwError = false
  ): string | undefined {
    const obj = store.getObjects(null, predicate, null);
    if (obj && obj.length === 1) {
      return obj.at(0)!.value;
    } else if (throwError) {
      throw new Error(`Could not find a ${predicate.id} for Shape.`);
    } else {
      return undefined;
    }
  }

  private parsePropertyShapes(store: Store, context: Context): PropertyShape[] {
    // Get all quads with a sh:property predicate
    return store
      .getQuads(null, vocab.SHACL.property, null, null)
      .map(({ object: quadObject }) => {
        if (quadObject.termType === 'BlankNode') {
          const propertyQuads = context
            .getBlankNodes()
            .filter((quad) => quad.subject.equals(quadObject));
          return new PropertyShape(propertyQuads, context);
        }
      })
      .filter((item) => item !== undefined) as PropertyShape[];
  }
}
