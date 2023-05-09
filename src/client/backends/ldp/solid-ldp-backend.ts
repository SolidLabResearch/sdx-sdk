import { makeExecutableSchema } from '@graphql-tools/schema';
import { readFile } from 'fs/promises';
import { GraphQLResolveInfo, graphql, isScalarType, print } from 'graphql';
import { ExecutionResult } from 'graphql/execution/execute';
import { DocumentNode } from 'graphql/language/ast';
import { LdpClient, SolidClientCredentials } from '../../../commons';
import { URI_SDX_GENERATE_GRAPHQL_SCHEMA } from '../../../constants';
import { ShaclReaderService } from '../../../parse';
import { MutationHandler } from './impl/mutation-handler';
import { QueryHandler } from './impl/query-handler';
import {
  IntermediateResult,
  getCurrentDirective,
  getRawType
} from './impl/utils';
import {
  StaticTargetResolver,
  TargetResolver,
  TargetResolverContext
} from './target-resolvers';

export class SolidLDPContext implements SolidTargetBackendContext {
  resolver: TargetResolver;

  constructor(staticUrl: string);
  constructor(resolver: TargetResolver);
  constructor(staticUrlOrResolver: TargetResolver | string) {
    if (typeof staticUrlOrResolver === 'string') {
      this.resolver = new StaticTargetResolver(staticUrlOrResolver);
    } else {
      this.resolver = staticUrlOrResolver;
    }
  }
}

export interface SolidLDPBackendOptions {
  schemaFile?: string;
  clientCredentials?: SolidClientCredentials;
  defaultContext?: SolidLDPContext;
}

export class SolidLDPBackend implements SolidTargetBackend<SolidLDPContext> {
  private schemaFile: string;
  private defaultContext?: SolidLDPContext;
  private queryHandler: QueryHandler;
  private mutationHandler: MutationHandler;
  private ldpClient: LdpClient;
  // private targetResolverContext: TargetResolverContext;

  constructor(options?: SolidLDPBackendOptions) {
    this.schemaFile = options?.schemaFile || URI_SDX_GENERATE_GRAPHQL_SCHEMA;
    this.defaultContext = options?.defaultContext;
    this.ldpClient = new LdpClient(options?.clientCredentials);
    // this.targetResolverContext = new TargetResolverContext(this.ldpClient);
    this.queryHandler = new QueryHandler(this.ldpClient);
    this.mutationHandler = new MutationHandler(this.ldpClient);
  }

  requester = async <R, V>(
    doc: DocumentNode,
    vars?: V,
    context?: SolidLDPContext
  ): Promise<ExecutionResult<R>> => {
    // If no options, try setting a default context as options
    context = context ?? this.defaultContext;
    const query = print(doc);
    const typeDefs = (await readFile(this.schemaFile)).toString();
    const schema = makeExecutableSchema({ typeDefs });
    const result = await graphql({
      source: query,
      variableValues: vars!,
      schema,
      contextValue: context,
      fieldResolver: this.fieldResolver
    });
    return result as ExecutionResult<R>;
  };

  private fieldResolver = async <TArgs>(
    source: IntermediateResult,
    args: TArgs,
    context: SolidLDPContext,
    info: GraphQLResolveInfo
  ): Promise<unknown> => {
    // IF Directive @identifier is present
    const directive = getCurrentDirective(info);
    if ('identifier' in directive) {
      return this.queryHandler.handleIdProperty(source);
    } else if ('property' in directive) {
      // IF Directive @property is present
      const rawType = getRawType(
        info.parentType.getFields()[info.fieldName]!.type
      );
      // IF Scalar
      if (isScalarType(rawType)) {
        return this.queryHandler.handleScalarProperty(source, info);
      }
      // else Relation
      else {
        return this.queryHandler.handleRelationProperty(source, info);
      }
    } else {
      // IF MUTATION
      if ('mutation' === info.operation.operation && !source?.mutationHandled) {
        return this.mutationHandler.handleMutationEntrypoint(
          source,
          args,
          context,
          info
        );
      }
      // Else QUERY
      else {
        return this.queryHandler.handleQueryEntrypoint(
          source,
          args,
          context,
          info
        );
      }
    }
  };
}

export interface SolidTargetBackend<
  C extends SolidTargetBackendContext,
  E = unknown
> {
  requester: <R, V>(
    doc: DocumentNode,
    vars?: V,
    context?: C
  ) => Promise<ExecutionResult<R, E>>;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SolidTargetBackendContext {}
