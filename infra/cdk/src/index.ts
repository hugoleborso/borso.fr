/**
 * @borso/infra — internal API consumed by sibling workspace apps.
 *
 * Every export here is `@beta`. Breaking changes are free since the only
 * consumers are in this monorepo.
 */

export type { DsqlClusterProps, IDsqlCluster } from './constructs/dsql-cluster.js';
export { DsqlCluster, lookupDsqlCluster } from './constructs/dsql-cluster.js';
export type { DsqlClusterStackProps } from './constructs/dsql-cluster-stack.js';
export { DsqlClusterStack } from './constructs/dsql-cluster-stack.js';
export type { DsqlSchemaCloneFromConfig, DsqlSchemaProps } from './constructs/dsql-schema.js';
export { DsqlSchema } from './constructs/dsql-schema.js';
export type { LambdaApiProps } from './constructs/lambda-api.js';
export { LambdaApi } from './constructs/lambda-api.js';
export type { PhotosCdnProps } from './constructs/photos-cdn.js';
export { PhotosCdn } from './constructs/photos-cdn.js';
export type { PreviewableAppProps } from './constructs/previewable-app.js';
export { PreviewableApp } from './constructs/previewable-app.js';
export type { StaticSiteProps } from './constructs/static-site.js';
export { StaticSite } from './constructs/static-site.js';
export { HOST_ROUTING_FUNCTION_CODE } from './internal/cf-host-routing-function.js';

// Env-validation helpers for app CDK entrypoints (`apps/<x>/bin/app.ts`).
export {
  requireAwsAccount,
  requireDeployStage,
  requireEnv,
  requirePrNumber,
} from './internal/env.js';
export { frontendOrigin, type Stage } from './internal/naming.utils.js';
export type { GithubSubject, SubjectKind } from './internal/oidc.js';
// Lower-level helpers needed by infra/shared/ (sibling workspace).
export { GITHUB_OIDC_ISSUER, githubActionsPrincipal, githubSubClaim } from './internal/oidc.js';
