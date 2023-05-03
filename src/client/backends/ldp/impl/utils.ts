import axios from 'axios';
import {
  GraphQLBoolean,
  GraphQLField,
  GraphQLFloat,
  GraphQLInputField,
  GraphQLInt,
  GraphQLNamedType,
  GraphQLObjectType,
  GraphQLResolveInfo,
  GraphQLString,
  GraphQLType,
  isListType,
  isNonNullType,
  isScalarType
} from 'graphql';
import {
  BlankNode,
  DataFactory,
  NamedNode,
  Parser,
  Quad,
  Store,
  Term,
  Variable
} from 'n3';
import { Graph, LdpClient, vocab } from '../../../../commons';
import { RDFS } from '../../../../commons/vocab';

const { namedNode } = DataFactory;

export type Primitive = boolean | number | string;
export enum ResourceType {
  CONTAINER,
  DOCUMENT
}

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

export function getRawType(type: GraphQLType): GraphQLNamedType {
  if (isListType(type)) {
    return getRawType(type.ofType);
  }
  if (isNonNullType(type)) {
    return getRawType(type.ofType);
  }
  return type;
}

export interface IntermediateResultInput {
  requestURL?: URL;
  documentGraph: Graph;
  resourceType: ResourceType;
  /** The subject node that we descended into */
  subject?: Term;
  mutationHandled?: boolean;
}

export class IntermediateResult {
  requestURL?: URL;
  documentGraph: Graph;
  resourceType: ResourceType;
  /** The subject node that we descended into */
  subject?: Term;
  mutationHandled?: boolean;

  constructor(input: IntermediateResultInput) {
    this.requestURL = input.requestURL;
    this.documentGraph = input.documentGraph;
    this.resourceType = input.resourceType;
    this.subject = input.subject;
    this.mutationHandled = input.mutationHandled;
  }

  static copy(
    source: IntermediateResult,
    override?: Partial<IntermediateResultInput>
  ): IntermediateResult {
    const copy = override ? { ...source, ...override } : source;
    return new IntermediateResult(copy);
  }

  getFQSubject(): string {
    const subject = this.subject?.value ?? '';
    return subject.length === 0 || subject.startsWith('#')
      ? this.requestURL!.toString().concat(subject)
      : subject;
  }
}

export function getClassURI(type: GraphQLType): NamedNode {
  return namedNode(getDirectives(type).is?.class ?? '');
}

export function getPropertyIRI(type: GraphQLType): NamedNode {
  return namedNode(getDirectives(type).property?.iri ?? '');
}

export function getCurrentDirective(
  info: GraphQLResolveInfo
): Record<string, Record<string, any>> {
  const { schema, path } = info;
  const { key, typename } = path;

  if (typename) {
    const type = key
      ? (schema.getType(typename) as GraphQLObjectType).getFields()[key]!
      : schema.getType(typename);
    return (
      (type?.extensions?.directives as Record<string, Record<string, any>>) ??
      {}
    );
  }
  return {};
}

export async function getInstanceById(
  ldpCLient: LdpClient,
  targetUrl: URL,
  id: string,
  classUri: NamedNode,
  resourceType: ResourceType
): Promise<IntermediateResult | undefined> {
  const documentUrl =
    resourceType === ResourceType.DOCUMENT
      ? targetUrl
      : getAbsoluteURL(id, targetUrl);
  if (!documentUrl.toString().startsWith(targetUrl.toString())) {
    throw new Error(
      `Entity with id ${documentUrl} is not in range of target URL ${targetUrl}`
    );
  }
  const documentGraph = await ldpCLient.downloadDocumentGraph(documentUrl);
  return documentGraph.find(namedNode(id), RDFS.a, classUri).map(
    (quad) =>
      new IntermediateResult({
        requestURL: targetUrl,
        resourceType,
        documentGraph,
        subject: quad.subject!
      })
  )[0];
}

export function convertScalarValue(
  type: GraphQLType,
  literal: string
): Primitive {
  if (!isScalarType(type)) {
    throw new Error(`Type ${type} is not a scalar type`);
  }
  switch (type) {
    case GraphQLBoolean:
      return new Boolean(literal).valueOf();
    case GraphQLFloat:
      return parseFloat(literal).valueOf();
    case GraphQLInt:
      return parseInt(literal).valueOf();
    default:
    case GraphQLString:
      return literal;
  }
}

function getAbsoluteURL(urlOrRelativePath: string, baseUrl: URL): URL {
  try {
    return new URL(urlOrRelativePath);
  } catch {
    const result = urlOrRelativePath.startsWith('/')
      ? urlOrRelativePath.slice(1)
      : urlOrRelativePath;
    return new URL(`${baseUrl.toString()}/${result}`);
  }
}
