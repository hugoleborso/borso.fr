/**
 * @borso/infra — internal API consumed by sibling workspace apps.
 *
 * Every export here is `@beta`. Breaking changes are free since the only
 * consumers are in this monorepo.
 */

export { StaticSite } from './constructs/static-site.js';
export type { StaticSiteProps } from './constructs/static-site.js';

export { LambdaApi } from './constructs/lambda-api.js';
export type { LambdaApiProps } from './constructs/lambda-api.js';

export { DsqlSchema } from './constructs/dsql-schema.js';
export type { DsqlSchemaProps } from './constructs/dsql-schema.js';

export { PreviewableApp } from './constructs/previewable-app.js';
export type { PreviewableAppProps } from './constructs/previewable-app.js';

export type { Stage } from './internal/naming.js';

// Lower-level helpers needed by infra/shared/ (sibling workspace).
export {
  GITHUB_OIDC_ISSUER,
  githubActionsPrincipal,
  githubSubClaim,
} from './internal/oidc.js';
export type { GithubSubject, SubjectKind } from './internal/oidc.js';
export { HOST_ROUTING_FUNCTION_CODE } from './internal/cf-host-routing-function.js';
