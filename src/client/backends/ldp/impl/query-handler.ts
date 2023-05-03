import { GraphQLResolveInfo, isListType, isNonNullType } from 'graphql';
import { DataFactory } from 'n3';
import { LdpClient } from '../../../../commons';
import { RDFS } from '../../../../commons/vocab';
import { SolidLDPContext } from '../solid-ldp-backend';
import { TargetResolverContext } from '../target-resolvers';
import {
  IntermediateResult,
  Primitive,
  ResourceType,
  convertScalarValue,
  getClassURI,
  getCurrentDirective,
  getInstanceById,
  getRawType
} from './utils';

const { namedNode } = DataFactory;

export class QueryHandler {
  constructor(private ldpClient: LdpClient) {}

  /**
   * Handler for an id property.
   * @param source
   */
  handleIdProperty(source: IntermediateResult): string {
    return source.getFQSubject();
  }

  /**
   * Handler for a scalar property.
   * @param source
   * @param info
   */
  async handleScalarProperty(
    source: IntermediateResult,
    info: GraphQLResolveInfo
  ): Promise<Primitive | Primitive[]> {
    const iri = namedNode(getCurrentDirective(info).property!.iri);
    const type = info.parentType.getFields()[info.fieldName]!.type;
    const rawType = getRawType(type);
    const result = source.documentGraph
      .find(source.subject!, iri, null)
      .map((quad) => convertScalarValue(rawType, quad.object.value));
    return isListType(type) || (isNonNullType(type) && isListType(type.ofType))
      ? result
      : result[0]!;
  }

  /**
   * Handler for a relation property.
   * This is a yet unresolved property that will be resolved later on.
   * @param source
   * @param info
   */
  async handleRelationProperty(
    source: IntermediateResult,
    info: GraphQLResolveInfo
  ): Promise<IntermediateResult | IntermediateResult[]> {
    const iri = namedNode(getCurrentDirective(info).property!.iri);
    const type = info.parentType.getFields()[info.fieldName]!.type;
    const classUri = getClassURI(type);
    const result = source.documentGraph
      .find(source.subject!, iri, null)
      .filter(
        (quad) =>
          source.documentGraph.find(quad.object, RDFS.a, classUri).length > 0
      )
      .map((quad) => IntermediateResult.copy(source, { subject: quad.object }));
    return isListType(type) || (isNonNullType(type) && isListType(type.ofType))
      ? result
      : result[0]!;
  }

  /**
   * Handler for a query entrypoint.
   * This is the first handler for aueries.
   * @param source
   * @param args
   * @param context
   * @param info
   */
  async handleQueryEntrypoint<TArgs>(
    source: IntermediateResult,
    args: TArgs,
    context: SolidLDPContext,
    info: GraphQLResolveInfo
  ): Promise<IntermediateResult | IntermediateResult[] | undefined> {
    // FIXME: temporary set resourcetype

    const classUri = getClassURI(info.returnType);
    const targetUrl = await context.resolver.resolve(
      classUri.value,
      new TargetResolverContext(this.ldpClient)
    );
    if (targetUrl != null) {
      const resourceType = await this.ldpClient.fetchResourceType(targetUrl);
      // Identifier could be passed as argument or be part of the source (subject)
      const id = (args as any).id ?? source?.subject?.value;
      if (id !== null && id !== undefined) {
        // Instance entrypoint
        return getInstanceById(
          this.ldpClient,
          targetUrl,
          id,
          classUri,
          resourceType
        );
      } else {
        // Collection entrypoint
        const documentGraph =
          resourceType === ResourceType.DOCUMENT
            ? await this.ldpClient.downloadDocumentGraph(targetUrl)
            : await this.ldpClient.downloadContainerAsGraph(targetUrl);
        return documentGraph.find(null, RDFS.a, classUri).map(
          (quad) =>
            new IntermediateResult({
              requestURL: targetUrl,
              resourceType,
              documentGraph,
              subject: quad.subject
            })
        );
      }
    } else {
      throw new Error('A target URL for this request could not be resolved!');
    }
  }
}
