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
import { DataFactory, NamedNode, Term } from 'n3';
import { Graph, LdpClient } from '../../../../commons';
import { getDirectivesMap } from '../../../../commons/util';
import { RDFS } from '../../../../commons/vocab';

const { namedNode } = DataFactory;

export type Primitive = boolean | number | string;
export enum ResourceType {
  CONTAINER,
  DOCUMENT
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

export function getRawType(type: GraphQLType): GraphQLNamedType {
  if (isListType(type)) {
    return getRawType(type.ofType);
  }
  if (isNonNullType(type)) {
    return getRawType(type.ofType);
  }
  return type;
}

export function getClassURI(type: GraphQLType): NamedNode {
  return namedNode(getDirectivesMap(getRawType(type)).is?.class ?? '');
}

export function getPropertyIRI(
  field: GraphQLField<any, any> | GraphQLInputField
): NamedNode {
  return namedNode(getDirectivesMap(field).property?.iri ?? '');
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

    return getDirectivesMap(type!);
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
  const result = documentGraph.find(namedNode(id), RDFS.a, classUri).map(
    (quad) =>
      new IntermediateResult({
        requestURL: targetUrl,
        resourceType,
        documentGraph,
        subject: quad.subject!
      })
  )[0];
  return result;
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
