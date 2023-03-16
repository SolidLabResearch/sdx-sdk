import { Quad, Quad_Subject, Store } from 'n3';

declare function parseNameFromUri(uriString: string): string;
declare function groupBySubject(quads: Quad[]): Map<Quad_Subject, Quad[]>;
declare function printQuads(quads: Quad[] | Store, label?: string): void;

export { groupBySubject, parseNameFromUri, printQuads };
