import {
  GraphQLObjectType,
  GraphQLResolveInfo,
  graphql,
  isScalarType,
  print
} from 'graphql';
import { ExecutionResult } from 'graphql/execution/execute';
import { DocumentNode } from 'graphql/language/ast';
import { LdpClient, SolidClientCredentials } from '../../../commons';
import {
  URI_SDX_GENERATE_GRAPHQL_SCHEMA,
  URI_SDX_GENERATE_SHACL_FOLDER
} from '../../../constants';
import { ShaclReaderService } from '../../../parse';
import { MutationHandler } from './impl/mutation-handler';
import { QueryHandler } from './impl/query-handler';
import {
  IntermediateResult,
  ResourceType,
  getCurrentDirective,
  getRawType
} from './impl/utils';
import { StaticTargetResolver, TargetResolver } from './target-resolvers';
import { perfLogger } from '../../../commons/logger';
import { printQuads } from '../../../commons/util';

const logger = perfLogger;

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
  private rootTypes: string[] = [];
  private parser: ShaclReaderService;

  constructor(options?: SolidLDPBackendOptions) {
    // TODO: Use schema to parse, instead of SHACL files
    // Default to generated schema location
    this.schemaFile = options?.schemaFile || URI_SDX_GENERATE_GRAPHQL_SCHEMA;
    this.defaultContext = options?.defaultContext;
    const ldpClient = new LdpClient(options?.clientCredentials);
    this.queryHandler = new QueryHandler(ldpClient);
    this.mutationHandler = new MutationHandler(ldpClient);
    this.parser = new ShaclReaderService();
  }

  requester = async <R, V>(
    doc: DocumentNode,
    vars?: V,
    context?: SolidLDPContext
  ): Promise<ExecutionResult<R>> => {
    // If no options, try setting a default context as options
    context = context ?? this.defaultContext;
    const query = print(doc);
    const schema = await this.parser.parseSHACLs(URI_SDX_GENERATE_SHACL_FOLDER);

    this.rootTypes = [
      schema.getQueryType()?.name,
      schema.getMutationType()?.name,
      schema.getSubscriptionType()?.name
    ].filter((t) => !!t) as string[];

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
    // FIXME: If source is empty, set default
    if (!source) {
      source = {
        quads: [],
        resourceType: ResourceType.DOCUMENT
      };
    }

    // IF Directive @identifier is present
    const directive = getCurrentDirective(info);
    console.log(info.path, directive);
    if ('identifier' in directive) {
      console.log('IDENTFIIER');
      return this.queryHandler.handleIdProperty(source, args, context, info);
    } else if ('property' in directive) {
      const rawType = getRawType(
        info.parentType.getFields()[info.fieldName]!.type
      );
      console.log('PROPERTY', info.fieldName, rawType);
      if (isScalarType(rawType)) {
        // IF Scalar
        return this.queryHandler.handleScalarProperty(
          source,
          args,
          context,
          info
        );
      } else {
        // else Relation
        return this.queryHandler.handleRelationProperty(
          source,
          args,
          context,
          info
        );
      }
    } else {
      console.log('ELSE');
      // IF MUTATION
      if ('mutation' === info.operation.operation && !source.queryOverride) {
        return this.mutationHandler.handleMutation(
          source,
          args,
          context,
          info,
          this.rootTypes
        );
      } else {
        // printQuads(source.quads, 'override');
        return this.queryHandler.handleQueryEntrypoint(
          source,
          args,
          context,
          info
        );
      }
    }
  };

  // handleIdProperty();

  // ELSE IF Directive @property is present
  // IF Scalar
  // handleScalarProperty();
  // ELSE Relelation
  // handlerRelationProperty();

  // ELSE
  // IF MUTATION
  // handleMutationEntryPoint();
  // ELSE
  // handleQueryEntryPoint();

  //   const { operation } = info;
  //   // setup intermediate result
  //   source = source ?? {
  //     quads: [],
  //     resourceType: ResourceType.DOCUMENT
  //   };

  //   // Pure mutation
  //   if ('mutation' === operation.operation && !source.queryOverride) {
  //     return this.mutationHandler.handleMutation(
  //       source,
  //       args,
  //       context,
  //       info,
  //       this.rootTypes
  //     );
  //   }
  //   // Pure query, or mutation return type query (queryOverride)
  //   if ('query' === operation.operation || source.queryOverride) {
  //     // printQuads(source.quads, 'override');
  //     return this.queryHandler.handleQuery(
  //       source,
  //       args,
  //       context,
  //       info,
  //       this.rootTypes
  //     );
  //   }
  // };
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
