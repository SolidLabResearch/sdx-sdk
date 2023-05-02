import { GraphQLResolveInfo, isListType, isNonNullType } from 'graphql';
import { DataFactory } from 'n3';
import { LdpClient } from '../../../../commons';
import { RDFS } from '../../../../commons/vocab';
import { SolidLDPContext } from '../solid-ldp-backend';
import { TargetResolverContext } from '../target-resolvers';
import {
  IntermediateResult,
  ResourceType,
  convertScalarValue,
  getClassURI,
  getCurrentDirective,
  getInstanceById,
  getRawType
} from './utils';
import { doc } from 'prettier';

const { namedNode } = DataFactory;

export class QueryHandler {
  constructor(private ldpClient: LdpClient) {}

  async handleIdProperty<TArgs>(
    source: IntermediateResult,
    args: TArgs,
    context: SolidLDPContext,
    info: GraphQLResolveInfo
  ): Promise<string> {
    const subject = source.subject?.value ?? '';
    const result =
      subject.length === 0 || subject.startsWith('#')
        ? source.requestURL!.concat(subject)
        : subject;
    return result;
  }

  async handleScalarProperty<TArgs>(
    source: IntermediateResult,
    args: TArgs,
    context: SolidLDPContext,
    info: GraphQLResolveInfo
  ): Promise<any> {
    const iri = namedNode(getCurrentDirective(info).property!.iri);
    const type = info.parentType.getFields()[info.fieldName]!.type;
    const rawType = getRawType(type);
    const result = source
      .documentGraph!.find(source.subject!, iri, null)
      .map((quad) => convertScalarValue(rawType, quad.object.value));
    return isListType(type) || (isNonNullType(type) && isListType(type.ofType))
      ? result
      : result[0]!;
  }

  async handleRelationProperty<TArgs>(
    source: IntermediateResult,
    args: TArgs,
    context: SolidLDPContext,
    info: GraphQLResolveInfo
  ): Promise<IntermediateResult | IntermediateResult[]> {
    const iri = namedNode(getCurrentDirective(info).property!.iri);
    const type = info.parentType.getFields()[info.fieldName]!.type;
    const classUri = getClassURI(type);
    const result = source
      .documentGraph!.find(source.subject!, iri, null)
      .filter(
        (quad) =>
          source.documentGraph!.find(quad.object, RDFS.a, classUri).length > 0
      )
      .map(
        (quad) => ({ ...source, subject: quad.object } as IntermediateResult)
      );
    return isListType(type) || (isNonNullType(type) && isListType(type.ofType))
      ? result
      : result[0]!;
  }

  async handleQueryEntrypoint<TArgs>(
    source: IntermediateResult,
    args: TArgs,
    context: SolidLDPContext,
    info: GraphQLResolveInfo
  ): Promise<IntermediateResult | IntermediateResult[] | undefined> {
    // FIXME: temporary set resourcetype
    source.resourceType = ResourceType.DOCUMENT;

    const classUri = getClassURI(info.returnType);
    const targetUrl = await context.resolver.resolve(
      classUri.value,
      new TargetResolverContext(this.ldpClient)
    );
    if (targetUrl != null) {
      // Identifier could be passed as argument or be part of the source (subject)
      const id = (args as any).id ?? source.subject?.value;
      if (id !== null && id !== undefined) {
        // Instance entrypoint
        return getInstanceById(
          this.ldpClient,
          targetUrl,
          id,
          classUri,
          source.resourceType
        );
      } else {
        // Collection entrypoint
        const documentGraph = await this.ldpClient.downloadDocumentGraph(
          targetUrl
        );
        return documentGraph.find(null, RDFS.a, classUri).map(
          (quad) =>
            ({
              ...source,
              documentGraph,
              subject: quad.subject
            } as IntermediateResult)
        );
      }
    } else {
      throw new Error('A target URL for this request could not be resolved!');
    }
  }
}
