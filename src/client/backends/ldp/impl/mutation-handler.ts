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
import { BlankNode, DataFactory, NamedNode, Quad, Store, Variable } from 'n3';
import { v4 as uuidv4 } from 'uuid';
import { Graph, LdpClient, utils, vocab } from '../../../../commons';
import { decapitalize, printQuads } from '../../../../commons/util';
import { SolidLDPContext } from '../solid-ldp-backend';
import { TargetResolverContext } from '../target-resolvers';
import {
  IntermediateResult,
  ResourceType,
  getDirectives,
  getInstanceById
} from './utils';

const { literal, namedNode, quad } = DataFactory;
const ID_FIELD = 'id';
const SLUG_FIELD = 'slug';

export class MutationHandler {
  constructor(private ldpClient: LdpClient) {}

  async handleMutationEntrypoint<TArgs>(
    source: IntermediateResult,
    args: TArgs,
    context: SolidLDPContext,
    info: GraphQLResolveInfo
  ): Promise<IntermediateResult | void> {
    const { fieldName } = info;
    if (fieldName === 'delete')
      return this.handleDeleteMutation(source, args, context, info);
    if (fieldName === 'update')
      return this.handleUpdateMutation(source, args, context, info);
    if (fieldName.startsWith('create'))
      return this.handleCreateMutation(source, args, context, info);
    if (fieldName.startsWith('mutate'))
      return this.handleGetMutateObjectType(source, args, context, info);
    if (fieldName.startsWith('set'))
      return this.handleSetMutation(source, args, context, info);
    if (fieldName.startsWith('clear'))
      return this.handleClearMutation(source, args, context, info);
    if (fieldName.startsWith('add'))
      return this.handleAddMutation(source, args, context, info);
    if (fieldName.startsWith('remove')) return this.TODO();
    if (fieldName.startsWith('link')) return this.TODO();
    if (fieldName.startsWith('unlink')) return this.TODO();
    // Mutation handler can't solve it, maybe the query handler can?
    return this.mutationHandled(source);
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
    const quads = this.generateTriplesForInput(
      source.subject,
      input,
      utils.unwrapNonNull(inputType) as GraphQLInputObjectType,
      namedNode(className)
    );
    source.documentGraph = new Graph(quads);
    switch (source.resourceType!) {
      case ResourceType.DOCUMENT:
        // Append triples to doc using patch
        await new LdpClient().patchDocument(targetUrl.toString(), quads);
    }
    return this.mutationHandled(source);
  }

  private async handleGetMutateObjectType<TArgs>(
    source: IntermediateResult,
    args: TArgs,
    context: SolidLDPContext,
    info: GraphQLResolveInfo
  ): Promise<IntermediateResult | undefined> {
    const className = getDirectives(info.returnType).is['class'];
    const targetUrl = await context.resolver.resolve(
      className,
      new TargetResolverContext(this.ldpClient)
    );

    if (targetUrl.toString()) {
      return getInstanceById(
        this.ldpClient,
        targetUrl,
        (args as any).id,
        className,
        source.resourceType
      );
    } else {
      throw new Error('A target URL for this request could not be resolved!');
    }
  }

  /* eslint-disable @typescript-eslint/no-unused-vars */
  private async handleDeleteMutation<TArgs>(
    source: IntermediateResult,
    args: TArgs,
    context: SolidLDPContext,
    info: GraphQLResolveInfo
  ): Promise<IntermediateResult> {
    const classIri = this.getDirectives(info.parentType).is['class'];
    const targetUrl = await context.resolver.resolve(
      classIri,
      new TargetResolverContext(this.ldpClient)
    );
    switch (source.resourceType!) {
      case ResourceType.DOCUMENT:
        // Append triples to doc using patch
        await new LdpClient().patchDocument(
          targetUrl.toString(),
          null,
          source.documentGraph?.getQuads()
        );
    }
    return this.mutationHandled(source);
  }
  /* eslint-enable @typescript-eslint/no-unused-vars */

  private async handleUpdateMutation<TArgs>(
    source: IntermediateResult,
    args: TArgs,
    context: SolidLDPContext,
    info: GraphQLResolveInfo
  ): Promise<IntermediateResult> {
    const returnType = info.schema.getType(
      utils.unwrapNonNull(info.returnType).toString()
    ) as GraphQLObjectType;
    const parentClassUri = getDirectives(info.parentType).is.class;
    const targetUrl = await context.resolver.resolve(
      parentClassUri,
      new TargetResolverContext(this.ldpClient)
    );
    const input = (args as any).input;
    console.log('up to here');
    const { inserts, deletes } = this.generateTriplesForUpdate(
      source.documentGraph!,
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
    const store = new Store(source.documentGraph?.getQuads());
    store.removeQuads(deletes);
    store.addQuads(inserts);
    source.documentGraph = new Graph(store.getQuads(null, null, null, null));
    return this.mutationHandled(source);
  }

  private async handleSetMutation<TArgs>(
    source: IntermediateResult,
    args: TArgs,
    context: SolidLDPContext,
    info: GraphQLResolveInfo
  ): Promise<IntermediateResult> {
    // Grab id of the parent object
    const parentId = source.subject!;
    const parentClassUri = getDirectives(info.parentType).is.class;
    // Grab the type of the return object
    const returnType = info.schema.getType(
      utils.unwrapNonNull(info.returnType).toString()
    ) as GraphQLObjectType;
    const targetUrl = await context.resolver.resolve(
      parentClassUri,
      new TargetResolverContext(this.ldpClient)
    );
    const input = (args as any).input;
    const inputId = namedNode(
      this.getNewInstanceID(input, source.resourceType!)
    );
    const inputType = info.parentType
      .getFields()
      [info.fieldName]!.args.find((arg) => arg.name === 'input')!.type;
    const className = this.getDirectives(inputType).is['class'];

    // Generate triples for creation (input quads)
    const inserts = this.generateTriplesForInput(
      inputId,
      input,
      utils.unwrapNonNull(inputType) as GraphQLInputObjectType,
      namedNode(className)
    );

    const originalFieldName = decapitalize(info.fieldName.slice('set'.length));
    const predicate = this.getDirectives(
      returnType.getFields()[originalFieldName]!
    ).property.iri;
    inserts.push(quad(parentId, namedNode(predicate), inputId));
    const deletes = source.documentGraph!.find(
      parentId,
      namedNode(predicate),
      null
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
    const store = new Store(source.documentGraph!.getQuads());
    store.removeQuads(deletes);
    store.addQuads(inserts);
    source.documentGraph = new Graph(store.getQuads(null, null, null, null));
    return this.mutationHandled(source);
  }

  private async handleClearMutation<TArgs>(
    source: IntermediateResult,
    args: TArgs,
    context: SolidLDPContext,
    info: GraphQLResolveInfo
  ): Promise<IntermediateResult> {
    // Grab id of the parent object
    const parentId = source.subject!;
    // Grab the type of the return object
    const returnType = info.schema.getType(
      utils.unwrapNonNull(info.returnType).toString()
    ) as GraphQLObjectType;
    const classUri = this.getDirectives(returnType).is['class'];
    const targetUrl = await context.resolver.resolve(
      classUri,
      new TargetResolverContext(this.ldpClient)
    );

    // What is the type of the parentField that we have to clear.
    const fieldName = decapitalize(info.fieldName.slice('clear'.length));
    const predicate = this.getDirectives(returnType.getFields()[fieldName]!)
      .property['iri'];
    const deletes = source.documentGraph!.find(
      parentId,
      namedNode(predicate),
      null
    );

    switch (source.resourceType!) {
      case ResourceType.DOCUMENT:
        // Update triples in doc using patch
        await new LdpClient().patchDocument(
          targetUrl.toString(),
          null,
          deletes
        );
    }

    printQuads(deletes, 'deletes');
    // Reconstruct object
    const store = new Store(source.documentGraph?.getQuads());
    store.removeQuads(deletes);
    source.documentGraph = new Graph(store.getQuads(null, null, null, null));
    return this.mutationHandled(source);
  }

  private async handleAddMutation<TArgs>(
    source: IntermediateResult,
    args: TArgs,
    context: SolidLDPContext,
    info: GraphQLResolveInfo
  ): Promise<IntermediateResult> {
    // Grab id of the parent object
    const parentId = source.subject!;
    const parentClassUri = getDirectives(info.parentType).is.class;
    // Grab the type of the return object
    const returnType = info.schema.getType(
      utils.unwrapNonNull(info.returnType).toString()
    ) as GraphQLObjectType;
    const targetUrl = await context.resolver.resolve(
      parentClassUri,
      new TargetResolverContext(this.ldpClient)
    );
    const input = (args as any).input;
    const inputId = namedNode(
      this.getNewInstanceID(input, source.resourceType!)
    );
    const inputType = info.parentType
      .getFields()
      [info.fieldName]!.args.find((arg) => arg.name === 'input')!.type;
    const className = this.getDirectives(inputType).is['class'];

    // Generate triples for creation (input quads)
    const inserts = this.generateTriplesForInput(
      inputId,
      input,
      utils.unwrapNonNull(inputType) as GraphQLInputObjectType,
      namedNode(className)
    );

    const originalFieldName = decapitalize(info.fieldName.slice('add'.length));
    const predicate = this.getDirectives(
      returnType.getFields()[originalFieldName]!
    ).property.iri;
    inserts.push(quad(parentId, namedNode(predicate), inputId));

    switch (source.resourceType!) {
      case ResourceType.DOCUMENT:
        // Update triples in doc using patch
        await new LdpClient().patchDocument(
          targetUrl.toString(),
          inserts,
          null
        );
    }
    // Reconstruct object
    const store = new Store(source.documentGraph!.getQuads());
    store.addQuads(inserts);
    source.documentGraph = new Graph(store.getQuads(null, null, null, null));
    return this.mutationHandled(source);
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
    graph: Graph,
    input: Record<string, any>,
    subject: NamedNode | BlankNode | Variable,
    objectTypeDefinition: GraphQLObjectType
  ): { inserts: Quad[]; deletes: Quad[] } {
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
        // Add quad to deletes, because it was explicitly set to null
        deletes.push(...graph.find(subject, namedNode(propertyIri), null));
      } else {
        // Remove and then insert quads, to perform upgrade
        deletes.push(...graph.find(subject, namedNode(propertyIri), null));
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

  /**
   * Sets the mutation handled flag on the IntermediateResult.
   * This will allow it to be handled as though it was a Query.
   * @param source
   * @returns
   */
  private mutationHandled(source: IntermediateResult): IntermediateResult {
    return { ...source, mutationHandled: true };
  }
}
