import "../../chunk-G42LTC7K.mjs";
import { Store } from "n3";
import { PropertyShape } from "./property-shape.js";
import { utils, vocab } from "../../commons";
class Shape {
  /**
   * Parse relevant quads to Shapes
   * @param quads The quads that make up the Shape
   * @param context Any toplevel quads that have a BlankNode subject
   */
  constructor(quads, context) {
    this.quads = quads;
    const store = new Store(quads);
    this.name = this.parseName(store);
    this.targetClass = this.parseObject(store, vocab.SHACL.targetClass);
    this.propertyShapes = this.parsePropertyShapes(store, context);
  }
  parseName(store) {
    const sub = store.getSubjects(vocab.RDFS.a, vocab.SHACL.NodeShape, null);
    if (sub && sub.length === 1) {
      return utils.parseNameFromUri(sub.at(0).value);
    } else {
      throw new Error("There must be just one Subject for 'a' NodeShape.");
    }
  }
  parseObject(store, predicate, throwError = false) {
    const obj = store.getObjects(null, predicate, null);
    if (obj && obj.length === 1) {
      return obj.at(0).value;
    } else if (throwError) {
      throw new Error(`Could not find a ${predicate.id} for Shape.`);
    } else {
      return void 0;
    }
  }
  parsePropertyShapes(store, context) {
    return store.getQuads(null, vocab.SHACL.property, null, null).map(({ object: quadObject }) => {
      if (quadObject.termType === "BlankNode") {
        const propertyQuads = context.getBlankNodes().filter((quad) => quad.subject.equals(quadObject));
        return new PropertyShape(propertyQuads, context);
      }
    }).filter((item) => item !== void 0);
  }
}
export {
  Shape
};
