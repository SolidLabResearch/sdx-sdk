import * as n3 from 'n3';

declare const RDFS: {
    a: n3.NamedNode<"http://www.w3.org/1999/02/22-rdf-syntax-ns#type">;
    langString: n3.NamedNode<"http://www.w3.org/1999/02/22-rdf-syntax-ns#langString">;
};
declare const SHACL: {
    class: n3.NamedNode<"http://www.w3.org/ns/shacl#class">;
    datatype: n3.NamedNode<"http://www.w3.org/ns/shacl#datatype">;
    description: n3.NamedNode<"http://www.w3.org/ns/shacl#description">;
    minCount: n3.NamedNode<"http://www.w3.org/ns/shacl#minCount">;
    maxCount: n3.NamedNode<"http://www.w3.org/ns/shacl#maxCount">;
    name: n3.NamedNode<"http://www.w3.org/ns/shacl#name">;
    NodeShape: n3.NamedNode<"http://www.w3.org/ns/shacl#NodeShape">;
    path: n3.NamedNode<"http://www.w3.org/ns/shacl#path">;
    PropertyShape: n3.NamedNode<"http://www.w3.org/ns/shacl#PropertyShape">;
    property: n3.NamedNode<"http://www.w3.org/ns/shacl#property">;
    targetClass: n3.NamedNode<"http://www.w3.org/ns/shacl#targetClass">;
};
declare const XSD: {
    int: n3.NamedNode<"http://www.w3.org/2001/XMLSchema#int">;
    float: n3.NamedNode<"http://www.w3.org/2001/XMLSchema#float">;
    string: n3.NamedNode<"http://www.w3.org/2001/XMLSchema#string">;
    boolean: n3.NamedNode<"http://www.w3.org/2001/XMLSchema#boolean">;
};

declare const vocab_RDFS: typeof RDFS;
declare const vocab_SHACL: typeof SHACL;
declare const vocab_XSD: typeof XSD;
declare namespace vocab {
  export {
    vocab_RDFS as RDFS,
    vocab_SHACL as SHACL,
    vocab_XSD as XSD,
  };
}

export { RDFS as R, SHACL as S, XSD as X, vocab as v };
