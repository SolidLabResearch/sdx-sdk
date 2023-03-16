import { Quad, Quad_Subject, Store } from "n3";
import { isArray } from "util";

export function parseNameFromUri(uriString: string): string {
    const uri = new URL(uriString);
    // If the URI has a fragment, use fragment, otherwise use the last path segment
    return uri.hash.length > 0 ? uri.hash.slice(1) : uri.pathname.slice(uri.pathname.lastIndexOf('/') + 1);
}

export function groupBySubject(quads: Quad[]): Map<Quad_Subject, Quad[]> {
    return quads.reduce((index, quad) => {
        if (index.has(quad.subject)) {
            index.get(quad.subject)!.push(quad)
        } else {
            index.set(quad.subject, [quad]);
        }
        return index;
    }, new Map<Quad_Subject, Quad[]>());
}

export function printQuads(quads: Quad[] | Store, label?: string) {
    if (label) {
        console.log(`${label} ==> `)
    }
    let q = isArray(quads) ? quads : quads.getQuads(null, null, null, null);
    q.forEach(q => console.log(`[${q.subject.value} ${q.predicate.value} ${q.object.value}]`));
}
