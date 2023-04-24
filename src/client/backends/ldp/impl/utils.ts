import { Quad, Store, DataFactory, Parser } from 'n3';
import type { NamedNode } from 'n3';
import { vocab } from '../../../../commons';
import axios from 'axios';
import {
  GraphQLField,
  GraphQLInputField,
  GraphQLType,
  isListType,
  isNonNullType,
  isScalarType
} from 'graphql';

const { namedNode } = DataFactory;

/* eslint-disable @typescript-eslint/no-unused-vars */
export async function getSubGraphArray(
  source: Quad[],
  className: string,
  predicate: string | null,
  args: Record<string, any>
): Promise<Quad[][]> {
  const store = new Store(source);
  // TODO: generate subgraphs based on sub in [sub ?className ? ?]
  const quadsOfQuads = store
    .getSubjects(vocab.RDFS.a, namedNode(className), null)
    .map(
      async (sub) =>
        await getSubGraph(source, className, predicate, { id: sub.value })
    );
  return Promise.all(quadsOfQuads);
}
/* eslint-enable @typescript-eslint/no-unused-vars */

export async function getSubGraph(
  source: Quad[],
  className: string,
  predicate: string | null,
  args: Record<string, any>
): Promise<Quad[]> {
  const store = new Store(source);
  const id = args?.id;
  const topQuads = store
    .getSubjects(vocab.RDFS.a, namedNode(className), null)
    .flatMap((sub) => {
      if (id) {
        return sub.value === id ? store.getQuads(sub, null, null, null) : [];
      } else {
        return store.getQuads(sub, null, null, null);
      }
    });
  const follow = (quads: Quad[], store: Store): Quad[] => {
    return quads.reduce(
      (acc, quad) =>
        quad.object.termType === 'BlankNode' ||
        quad.object.termType === 'NamedNode'
          ? [
              ...acc,
              quad,
              ...follow(store.getQuads(quad.object, null, null, null), store)
            ]
          : [...acc, quad],
      [] as Quad[]
    );
  };
  return follow(topQuads, store);
}

export async function getGraph(location: string): Promise<Quad[]> {
  const doc = await axios.get(location);
  return new Parser().parse(doc.data);
}

export function getDirectives(
  type: GraphQLType | GraphQLField<any, any, any> | GraphQLInputField
): Record<string, any> {
  if (isListType(type)) {
    return getDirectives(type.ofType);
  }
  if (isNonNullType(type)) {
    return getDirectives(type.ofType);
  }
  return isScalarType(type) ? {} : type.extensions.directives ?? {};
}

export enum ResourceType {
  CONTAINER,
  DOCUMENT
}

export interface IntermediateResult {
  quads: Quad[];
  parentClassIri?: string;
  resourceType: ResourceType;
  subject?: NamedNode;
  queryOverride?: boolean;
}
