import {
  GraphQLField,
  GraphQLInputField,
  GraphQLInputObjectType,
  GraphQLObjectType,
  GraphQLResolveInfo,
  GraphQLType,
  isListType,
  isNonNullType,
  isScalarType
} from 'graphql';
import { DataFactory, NamedNode, Quad, Store } from 'n3';
import { v4 as uuidv4 } from 'uuid';
import { LdpClient, utils, vocab } from '../../../../commons';
import { SolidLDPContext } from '../solid-ldp-backend';
import { TargetResolverContext } from '../target-resolvers';
import {
  IntermediateResult,
  ResourceType,
  getDirectives,
  getGraph,
  getSubGraph
} from './utils';

const { literal, namedNode, quad } = DataFactory;
const ID_FIELD = 'id';
const SLUG_FIELD = 'slug';

export class MutationHandler {
  constructor(private ldpClient: LdpClient) {}

  async handleMutation<TArgs>(
    source: IntermediateResult,
    args: TArgs,
    context: SolidLDPContext,
    info: GraphQLResolveInfo,
    rootTypes: string[]
  ): Promise<unknown> {
    const { returnType, fieldName, parentType } = info;
    if (rootTypes.includes(parentType.name)) {
      const className = this.getDirectives(returnType).is['class'] as string;
      const targetUrl = await context.resolver.resolve(
        className,
        new TargetResolverContext(this.ldpClient)
      );
      const graph = await getGraph(targetUrl.toString());
      source.quads = await getSubGraph(graph, className, args as any);
    }
    if (fieldName === 'delete')
      return this.handleDeleteMutation(source, args, context, info);
    if (fieldName === 'update')
      return this.handleUpdateMutation(source, args, context, info);
    if (fieldName.startsWith('create'))
      return this.handleCreateMutation(source, args, context, info);
    if (fieldName.startsWith('mutate'))
      return this.handleGetMutateObjectType(source, args, context, info);
    if (fieldName.startsWith('set')) return this.TODO();
    if (fieldName.startsWith('clear')) return this.TODO();
    if (fieldName.startsWith('add')) return this.TODO();
    if (fieldName.startsWith('remove')) return this.TODO();
    if (fieldName.startsWith('link')) return this.TODO();
    if (fieldName.startsWith('unlink')) return this.TODO();
    // Mutation handler can't solve it, maybe the query handler can?
    return this.executeWithQueryHandler(source);
  }

  private async handleCreateMutation<TArgs>(
    source: IntermediateResult,
    args: TArgs,
    context: SolidLDPContext,
    info: GraphQLResolveInfo
  ): Promise<IntermediateResult> {
    const className = this.getDirectives(info.returnType).is['class'];
    const targetUrl = await context.resolver.resolve(
      className,
      new TargetResolverContext(this.ldpClient)
    );
    // Create mutations should always have an input argument.
    const input = (args as any).input;
    source.subject = namedNode(
      this.getNewInstanceID(input, source.resourceType!)
    );
    const inputType = info.parentType
      .getFields()
      [info.fieldName]!.args.find((arg) => arg.name === 'input')!.type;
    source.quads = this.generateTriplesForInput(
      source.subject,
      input,
      utils.unwrapNonNull(inputType) as GraphQLInputObjectType,
      namedNode(className)
    );
    switch (source.resourceType!) {
      case ResourceType.DOCUMENT:
        // Append triples to doc using patch
        await new LdpClient().patchDocument(targetUrl.toString(), source.quads);
    }
    return this.executeWithQueryHandler(source);
  }

  private async handleGetMutateObjectType<TArgs>(
    source: IntermediateResult,
    args: TArgs,
    context: SolidLDPContext,
    info: GraphQLResolveInfo
  ): Promise<IntermediateResult> {
    const className = getDirectives(info.returnType).is['class'];
    const targetUrl = await context.resolver.resolve(
      className,
      new TargetResolverContext(this.ldpClient)
    );

    if (targetUrl.toString()) {
      source.subject = namedNode((args as any).id);
      source.quads = await getSubGraph(source.quads!, className, args as any);
      source.parentClassIri = className;
      return source;
    } else {
      throw new Error('A target URL for this request could not be resolved!');
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async handleDeleteMutation<TArgs>(
    source: IntermediateResult,
    args: TArgs,
    context: SolidLDPContext,
    info: GraphQLResolveInfo
  ): Promise<IntermediateResult> {
    console.log('DELETE MUTATION');
    const targetUrl = await context.resolver.resolve(
      source.parentClassIri!,
      new TargetResolverContext(this.ldpClient)
    );
    switch (source.resourceType!) {
      case ResourceType.DOCUMENT:
        // Append triples to doc using patch
        await new LdpClient().patchDocument(
          targetUrl.toString(),
          null,
          source.quads
        );
    }
    return this.executeWithQueryHandler(source);
  }

  private async handleUpdateMutation<TArgs>(
    source: IntermediateResult,
    args: TArgs,
    context: SolidLDPContext,
    info: GraphQLResolveInfo
  ): Promise<IntermediateResult> {
    const returnType = info.schema.getType(
      utils.unwrapNonNull(info.returnType).toString()
    ) as GraphQLObjectType;
    const targetUrl = await context.resolver.resolve(
      source.parentClassIri!,
      new TargetResolverContext(this.ldpClient)
    );
    const input = (args as any).input;
    const { inserts, deletes } = this.generateTriplesForUpdate(
      source.quads!,
      input,
      source.subject!,
      returnType
    );
    switch (source.resourceType!) {
      case ResourceType.DOCUMENT:
        // Update triples in doc using patch
        await new LdpClient().patchDocument(
          targetUrl.toString(),
          inserts,
          deletes
        );
    }
    // Reconstruct object
    const store = new Store(source.quads);
    store.removeQuads(deletes);
    store.addQuads(inserts);
    source.quads = store.getQuads(null, null, null, null);
    return this.executeWithQueryHandler(source);
  }

  private getDirectives(
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

  private getNewInstanceID(
    input: Record<string, any>,
    resourceType: ResourceType
  ): string {
    switch (resourceType) {
      case ResourceType.CONTAINER:
        return '';
      case ResourceType.DOCUMENT:
        return (
          input[ID_FIELD]?.toString() ?? `#${input[SLUG_FIELD]}` ?? uuidv4()
        );
      default:
        return '';
    }
  }

  private generateTriplesForInput(
    subject: NamedNode,
    input: Record<string, any>,
    inputDefinition: GraphQLInputObjectType,
    classUri: NamedNode
  ): Quad[] {
    const quads: Quad[] = [];
    quads.push(quad(subject, vocab.RDFS.a, classUri));
    return Object.values(inputDefinition.getFields())
      .filter((field) => field.name !== 'slug' && field.name !== 'id')
      .reduce((acc, field) => {
        if (field.name in input) {
          acc.push(
            quad(
              subject,
              namedNode(getDirectives(field).property['iri']),
              literal(input[field.name])
            )
          );
        }
        return acc;
      }, quads);
  }

  private generateTriplesForUpdate(
    source: Quad[],
    input: Record<string, any>,
    subject: NamedNode,
    objectTypeDefinition: GraphQLObjectType
  ): { inserts: Quad[]; deletes: Quad[] } {
    const store = new Store(source);
    const inserts: Quad[] = [];
    const deletes: Quad[] = [];

    Object.entries(input).forEach(([fieldName, value]) => {
      const fieldDef = objectTypeDefinition.getFields()[fieldName]!;
      const propertyIri = getDirectives(fieldDef).property['iri'];

      // Throw error if value is null and type was nonnull
      if (value == null) {
        if (isNonNullType(fieldDef.type)) {
          throw new Error(
            `Update input provided null value for non-nullable field '${fieldName}'`
          );
        }
        // Add quad to deletes, because it was set explicitly set to null
        deletes.push(
          ...store.getQuads(subject, namedNode(propertyIri), null, null)
        );
      } else {
        // Remove and then insert quads, to perform upgrade
        deletes.push(
          ...store.getQuads(subject, namedNode(propertyIri), null, null)
        );
        if (isListType(fieldDef.type)) {
          inserts.push(
            ...value.map((v: any) =>
              quad(subject, namedNode(propertyIri), literal(v))
            )
          );
        } else {
          inserts.push(quad(subject, namedNode(propertyIri), literal(value)));
        }
      }
    });
    return { inserts, deletes };
  }

  private TODO() {
    alert('TODO');
  }

  private executeWithQueryHandler(
    source: IntermediateResult
  ): IntermediateResult {
    return { ...source, queryOverride: true };
  }
}
