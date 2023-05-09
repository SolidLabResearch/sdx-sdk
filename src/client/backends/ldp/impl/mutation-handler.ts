import {
  GraphQLInputObjectType,
  GraphQLObjectType,
  GraphQLResolveInfo,
  isListType,
  isNonNullType
} from 'graphql';
import { DataFactory, NamedNode, Quad, Term } from 'n3';
import { v4 as uuidv4 } from 'uuid';
import { Graph, LdpClient, utils, vocab } from '../../../../commons';
import { decapitalize } from '../../../../commons/util';
import { SolidLDPContext } from '../solid-ldp-backend';
import { TargetResolverContext } from '../target-resolvers';
import {
  IntermediateResult,
  ResourceType,
  getClassURI,
  getInstanceById,
  getPropertyIRI
} from './utils';

const { literal, namedNode, quad } = DataFactory;
const ID_FIELD = 'id';
const SLUG_FIELD = 'slug';

export class MutationHandler {
  constructor(private ldpClient: LdpClient) {}

  async handleMutationEntrypoint<TArgs>(
    source: IntermediateResult | undefined,
    args: TArgs,
    context: SolidLDPContext,
    info: GraphQLResolveInfo
  ): Promise<IntermediateResult | void> {
    const { fieldName } = info;
    if (fieldName === 'delete')
      return this.handleDeleteMutation(source!, context, info);
    if (fieldName === 'update')
      return this.handleUpdateMutation(source!, args, context, info);
    if (fieldName.startsWith('create'))
      return this.handleCreateMutation(args, context, info);
    if (fieldName.startsWith('mutate'))
      return this.handleGetMutateObjectType(args, context, info);
    if (fieldName.startsWith('set'))
      return this.handleSetMutation(source!, args, context, info);
    if (fieldName.startsWith('clear'))
      return this.handleClearMutation(source!, context, info);
    if (fieldName.startsWith('add'))
      return this.handleAddMutation(source!, args, context, info);
    if (fieldName.startsWith('remove'))
      return this.handleRemoveMutation(source!, args, context, info);
    if (fieldName.startsWith('link'))
      return this.handleLinkMutation(source!, args, context, info);
    if (fieldName.startsWith('unlink'))
      return this.handleUnlinkMutation(source!, args, context, info);
    // Mutation handler can't solve it, maybe the query handler can?
    return this.mutationHandled(source!);
  }

  private async handleCreateMutation<TArgs>(
    args: TArgs,
    context: SolidLDPContext,
    info: GraphQLResolveInfo
  ): Promise<IntermediateResult> {
    const classUri = getClassURI(info.returnType);
    const targetUrl = await context.resolver.resolve(
      classUri.value,
      new TargetResolverContext(this.ldpClient)
    );
    if (targetUrl) {
      const resourceType = await this.ldpClient.fetchResourceType(targetUrl);
      // Create mutations should always have an input argument.
      const input = (args as any).input;
      const id = namedNode(this.getNewInstanceID(input, resourceType));
      const inputType = info.parentType
        .getFields()
        [info.fieldName]!.args.find((arg) => arg.name === 'input')!.type;
      const content = new Graph(
        this.generateTriplesForInput(
          id,
          input,
          utils.unwrapNonNull(inputType) as GraphQLInputObjectType,
          classUri
        )
      );
      switch (resourceType) {
        case ResourceType.DOCUMENT: {
          await new LdpClient().patchDocument(targetUrl, content.getQuads());
          return this.mutationHandled(
            new IntermediateResult({
              requestURL: targetUrl,
              resourceType,
              documentGraph: content,
              subject: id
            })
          );
        }
        case ResourceType.CONTAINER: {
          const newDocumentURL = this.getNewDocumentURL(targetUrl, input);
          await this.ldpClient.putDocument(newDocumentURL, content);
          return this.mutationHandled(
            new IntermediateResult({
              requestURL: newDocumentURL,
              resourceType,
              documentGraph: content,
              subject: id
            })
          );
        }
      }
    } else {
      throw new Error('A target URL for this request could not be resolved!');
    }
  }

  private async handleGetMutateObjectType<TArgs>(
    args: TArgs,
    context: SolidLDPContext,
    info: GraphQLResolveInfo
  ): Promise<IntermediateResult | undefined> {
    const classUri = getClassURI(info.returnType);
    const targetUrl = await context.resolver.resolve(
      classUri.value,
      new TargetResolverContext(this.ldpClient)
    );

    if (targetUrl) {
      const resourceType = await this.ldpClient.fetchResourceType(targetUrl);
      return getInstanceById(
        this.ldpClient,
        targetUrl,
        (args as any).id,
        classUri,
        resourceType
      );
    } else {
      throw new Error('A target URL for this request could not be resolved!');
    }
  }

  private async handleDeleteMutation(
    source: IntermediateResult,
    context: SolidLDPContext,
    info: GraphQLResolveInfo
  ): Promise<IntermediateResult> {
    const classUri = getClassURI(info.parentType);
    const targetUrl = await context.resolver.resolve(
      classUri.value,
      new TargetResolverContext(this.ldpClient)
    );
    switch (source.resourceType!) {
      case ResourceType.CONTAINER: {
        await this.ldpClient.deleteDocument(new URL(source.getFQSubject()));
        break;
      }
      case ResourceType.DOCUMENT: {
        // Append triples to doc using patch
        await new LdpClient().patchDocument(
          targetUrl,
          null,
          source.documentGraph
        );
        break;
      }
    }
    return this.mutationHandled(source);
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
    const parentClassUri = getClassURI(info.parentType);
    const targetUrl = await context.resolver.resolve(
      parentClassUri.value,
      new TargetResolverContext(this.ldpClient)
    );
    const input = (args as any).input;
    const { inserts, deletes } = this.generateTriplesForUpdate(
      source.documentGraph!,
      input,
      source.subject!,
      returnType
    );
    // Update triples in doc using patch
    await new LdpClient().patchDocument(targetUrl, inserts, deletes);

    // Reconstruct object
    source.documentGraph.remove(...deletes).add(...inserts);
    return this.mutationHandled(source);
  }

  private async handleSetMutation<TArgs>(
    source: IntermediateResult,
    args: TArgs,
    context: SolidLDPContext,
    info: GraphQLResolveInfo
  ): Promise<IntermediateResult> {
    // Grab id of the parent object
    const parentId = namedNode(source.subject!.value);
    const parentClassUri = getClassURI(info.parentType);
    // Grab the type of the return object
    const returnType = info.schema.getType(
      utils.unwrapNonNull(info.returnType).toString()
    ) as GraphQLObjectType;
    const targetUrl = await context.resolver.resolve(
      parentClassUri.value,
      new TargetResolverContext(this.ldpClient)
    );
    const input = (args as any).input;
    const inputId = namedNode(
      this.getNewInstanceID(input, source.resourceType!)
    );
    const inputType = info.parentType
      .getFields()
      [info.fieldName]!.args.find((arg) => arg.name === 'input')!.type;
    const classUri = getClassURI(inputType);

    // Generate triples for creation (input quads)
    const inserts = this.generateTriplesForInput(
      inputId,
      input,
      utils.unwrapNonNull(inputType) as GraphQLInputObjectType,
      classUri
    );

    const origField = decapitalize(info.fieldName.slice('set'.length));
    const predicate = getPropertyIRI(returnType.getFields()[origField]!);
    inserts.push(quad(parentId, predicate, inputId));
    const deletes = source.documentGraph.find(parentId, predicate, null);

    // Update triples in doc using patch
    await new LdpClient().patchDocument(targetUrl, inserts, deletes);

    // Reconstruct object
    source.documentGraph.remove(...deletes).add(...inserts);
    return this.mutationHandled(source);
  }

  private async handleClearMutation(
    source: IntermediateResult,
    context: SolidLDPContext,
    info: GraphQLResolveInfo
  ): Promise<IntermediateResult> {
    // Grab id of the parent object
    const parentId = source.subject!;
    // Grab the type of the return object
    const returnType = info.schema.getType(
      utils.unwrapNonNull(info.returnType).toString()
    ) as GraphQLObjectType;
    const classUri = getClassURI(returnType);
    const targetUrl = await context.resolver.resolve(
      classUri.value,
      new TargetResolverContext(this.ldpClient)
    );

    // What is the type of the parentField that we have to clear.
    const fieldName = decapitalize(info.fieldName.slice('clear'.length));
    const predicate = getPropertyIRI(returnType.getFields()[fieldName]!);
    const deletes = source.documentGraph.find(parentId, predicate, null);

    // Update triples in doc using patch
    await new LdpClient().patchDocument(targetUrl, null, deletes);

    // Reconstruct object
    source.documentGraph.remove(...deletes);
    return this.mutationHandled(source);
  }

  private async handleAddMutation<TArgs>(
    source: IntermediateResult,
    args: TArgs,
    context: SolidLDPContext,
    info: GraphQLResolveInfo
  ): Promise<IntermediateResult> {
    // Grab id of the parent object
    const parentId = namedNode(source.subject!.value);
    const parentClassUri = getClassURI(info.parentType);
    // Grab the type of the return object
    const returnType = info.schema.getType(
      utils.unwrapNonNull(info.returnType).toString()
    ) as GraphQLObjectType;
    const targetUrl = await context.resolver.resolve(
      parentClassUri.value,
      new TargetResolverContext(this.ldpClient)
    );
    const input = (args as any).input;
    const inputId = namedNode(
      this.getNewInstanceID(input, source.resourceType!)
    );
    const inputType = info.parentType
      .getFields()
      [info.fieldName]!.args.find((arg) => arg.name === 'input')!.type;
    const classUri = getClassURI(inputType);

    // Generate triples for creation (input quads)
    const inserts = this.generateTriplesForInput(
      inputId,
      input,
      utils.unwrapNonNull(inputType) as GraphQLInputObjectType,
      classUri
    );

    const origField = decapitalize(info.fieldName.slice('add'.length));
    const predicate = getPropertyIRI(returnType.getFields()[origField]!);
    inserts.push(quad(parentId, predicate, inputId));

    // Update triples in doc using patch
    await new LdpClient().patchDocument(targetUrl, inserts, null);

    // Reconstruct object
    source.documentGraph.add(...inserts);
    return this.mutationHandled(source);
  }

  private async handleRemoveMutation<TArgs>(
    source: IntermediateResult,
    args: TArgs,
    context: SolidLDPContext,
    info: GraphQLResolveInfo
  ): Promise<IntermediateResult> {
    // Grab id of the parent object
    const parentId = namedNode(source.subject!.value);
    // Grab the type of the return object
    const returnType = info.schema.getType(
      utils.unwrapNonNull(info.returnType).toString()
    ) as GraphQLObjectType;
    const classUri = getClassURI(returnType);
    const targetUrl = await context.resolver.resolve(
      classUri.value,
      new TargetResolverContext(this.ldpClient)
    );

    const id = namedNode((args as any).id);

    // What is the type of the parentField that we have to clear.
    const fieldName = decapitalize(info.fieldName.slice('remove'.length));
    const predicate = getPropertyIRI(returnType.getFields()[fieldName]!);
    const deletes = source.documentGraph.find(parentId, predicate, id);

    // Update triples in doc using patch
    await new LdpClient().patchDocument(targetUrl, null, deletes);

    // Reconstruct object
    source.documentGraph.remove(...deletes);
    return this.mutationHandled(source);
  }

  private async handleLinkMutation<TArgs>(
    source: IntermediateResult,
    args: TArgs,
    context: SolidLDPContext,
    info: GraphQLResolveInfo
  ): Promise<IntermediateResult> {
    // Grab id of the parent object
    const parentId = namedNode(source.subject!.value);
    const parentClassUri = getClassURI(info.parentType);
    // Grab the type of the return object
    const returnType = info.schema.getType(
      utils.unwrapNonNull(info.returnType).toString()
    ) as GraphQLObjectType;
    const targetUrl = await context.resolver.resolve(
      parentClassUri.value,
      new TargetResolverContext(this.ldpClient)
    );
    const id = namedNode((args as any).id);

    const origField = decapitalize(info.fieldName.slice('link'.length));
    const predicate = getPropertyIRI(returnType.getFields()[origField]!);
    const originalFieldType = returnType.getFields()[origField]?.type;
    const isCollection =
      isListType(originalFieldType) ||
      (isNonNullType(originalFieldType) &&
        isListType(originalFieldType.ofType));
    const inserts = [quad(parentId, predicate, id)];
    const deletes = isCollection
      ? []
      : source.documentGraph.find(parentId, predicate, null);

    // Update triples in doc using patch
    await new LdpClient().patchDocument(targetUrl, inserts, deletes);

    // Reconstruct object
    source.documentGraph.remove(...deletes).add(...inserts);
    return this.mutationHandled(source);
  }

  private async handleUnlinkMutation<TArgs>(
    source: IntermediateResult,
    args: TArgs,
    context: SolidLDPContext,
    info: GraphQLResolveInfo
  ): Promise<IntermediateResult> {
    // Grab id of the parent object
    const parentId = namedNode(source.subject!.value);
    // Grab the type of the return object
    const returnType = info.schema.getType(
      utils.unwrapNonNull(info.returnType).toString()
    ) as GraphQLObjectType;
    const classUri = getClassURI(returnType);
    const targetUrl = await context.resolver.resolve(
      classUri.value,
      new TargetResolverContext(this.ldpClient)
    );

    const id = namedNode((args as any).id);

    // What is the type of the parentField that we have to clear.
    const fieldName = decapitalize(info.fieldName.slice('unlink'.length));
    const predicate = getPropertyIRI(returnType.getFields()[fieldName]!);
    const deletes = source.documentGraph.find(parentId, predicate, id);

    // Update triples in doc using patch
    await new LdpClient().patchDocument(targetUrl, null, deletes);

    // Reconstruct object
    source.documentGraph.remove(...deletes);
    return this.mutationHandled(source);
  }

  private getNewInstanceID(
    input: Record<string, any>,
    resourceType: ResourceType
  ): string {
    switch (resourceType) {
      case ResourceType.CONTAINER:
        return '';
      case ResourceType.DOCUMENT:
        return ID_FIELD in input
          ? input[ID_FIELD].toString()
          : SLUG_FIELD in input
          ? input[SLUG_FIELD].toString()
          : uuidv4();
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
        const propertyIRI = getPropertyIRI(field);
        if (field.name in input) {
          acc.push(quad(subject, propertyIRI, literal(input[field.name])));
        }
        return acc;
      }, quads);
  }

  private generateTriplesForUpdate(
    graph: Graph,
    input: Record<string, any>,
    subject: Term,
    objectTypeDefinition: GraphQLObjectType
  ): { inserts: Quad[]; deletes: Quad[] } {
    const inserts: Quad[] = [];
    const deletes: Quad[] = [];

    Object.entries(input).forEach(([fieldName, value]) => {
      const fieldDef = objectTypeDefinition.getFields()[fieldName]!;
      const propertyIri = getPropertyIRI(fieldDef);

      // Throw error if value is null and type was nonnull
      if (value == null) {
        if (isNonNullType(fieldDef.type)) {
          throw new Error(
            `Update input provided null value for non-nullable field '${fieldName}'`
          );
        }
        // Add quad to deletes, because it was explicitly set to null
        deletes.push(...graph.find(subject, propertyIri, null));
      } else {
        // Remove and then insert quads, to perform upgrade
        deletes.push(...graph.find(subject, propertyIri, null));
        if (isListType(fieldDef.type)) {
          inserts.push(
            ...value.map((v: any) =>
              quad(namedNode(subject.value), propertyIri, literal(v))
            )
          );
        } else {
          inserts.push(
            quad(namedNode(subject.value), propertyIri, literal(value))
          );
        }
      }
    });
    return { inserts, deletes };
  }

  /**
   * Sets the mutation handled flag on the IntermediateResult.
   * This will allow it to be handled as though it was a Query.
   * @param source
   * @returns
   */
  private mutationHandled(source: IntermediateResult): IntermediateResult {
    source.mutationHandled = true;
    return source;
  }

  private getNewDocumentURL(targetUrl: URL, input: Record<string, any>): URL {
    const id = input[ID_FIELD];
    const slug = input[SLUG_FIELD];
    if (id && id.startsWith(targetUrl.toString())) {
      return new URL(id.endsWith('.ttl') ? id : id + '.ttl');
    } else if (slug) {
      return new URL(
        targetUrl.toString().endsWith('/')
          ? targetUrl.toString() + `${slug}.ttl`
          : targetUrl.toString() + `/${slug}.ttl`
      );
    } else {
      return new URL(
        targetUrl.toString().endsWith('/')
          ? targetUrl.toString() + `${uuidv4()}.ttl`
          : targetUrl.toString() + `/${uuidv4()}.ttl`
      );
    }
  }
}
