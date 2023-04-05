export { SolidLDPBackend, SolidLDPBackendOptions, SolidLDPContext, SolidTargetBackend, SolidTargetBackendContext } from './backends/ldp/solid-ldp-backend.js';
export { StaticTargetResolver, TargetResolver, TargetResolverContext } from './backends/ldp/target-resolvers.js';
import 'graphql/jsutils/ObjMap';
import 'graphql/execution/execute';
import 'graphql/language/ast';
import './commons/auth/solid-client-credentials.js';
import './commons/ldp/ldp-client.js';
import 'axios';
import 'n3';
