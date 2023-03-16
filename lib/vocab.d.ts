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

export { RDFS, SHACL, XSD };
