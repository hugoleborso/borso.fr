/**
 * Resource naming conventions for the borso platform.
 *
 * Constructs MUST route every name through here so the conventions stay
 * consistent and enforceable by IAM policies.
 *
 * @beta
 */

/**
 * The full set of stages app code may reference. `dev` is a marker for app
 * code only — it selects local-Postgres connection paths in app handlers and
 * is never a valid stage for any of the naming helpers or constructs in this
 * package. Synthing a stack with `stage: 'dev'` throws.
 */
export type Stage = 'dev' | 'preview' | 'integ' | 'prod';

/** Subset of {@link Stage} that the platform actually deploys. */
type DeployStage = Exclude<Stage, 'dev'>;

const APP_SLUG_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const APP_SLUG_MAX_LENGTH = 32;

const PREVIEW_PARENT_DOMAIN = 'preview.borso.fr';
const INTEG_STACK_PREFIX = 'bp-integ';

export function validateAppSlug(slug: string): void {
  if (!APP_SLUG_PATTERN.test(slug)) {
    throw new Error(
      `Invalid app slug "${slug}": must be lowercase kebab-case, start with a letter.`,
    );
  }
  if (slug.length > APP_SLUG_MAX_LENGTH) {
    throw new Error(`App slug "${slug}" exceeds ${APP_SLUG_MAX_LENGTH} characters.`);
  }
}

/**
 * Throws if `stage` is `'dev'`. Acts as a TypeScript assertion so callers
 * see `stage` narrowed to {@link DeployStage}.
 */
export function assertDeployStage(stage: Stage): asserts stage is DeployStage {
  if (stage === 'dev') {
    throw new Error('Stage "dev" is not deployable; use prod/preview/integ.');
  }
}

interface NameContext {
  readonly app: string;
  readonly stage: Stage;
  readonly prNumber?: number;
}

function previewSuffix(prNumber: number | undefined): string {
  if (prNumber === undefined) {
    throw new Error('preview/integ stage requires prNumber.');
  }
  if (!Number.isInteger(prNumber) || prNumber <= 0) {
    throw new Error(`prNumber must be a positive integer, got ${prNumber}.`);
  }
  return `pr-${prNumber}`;
}

/**
 * CloudFormation stack name.
 *
 *   prod    -> "<app>-prod"
 *   preview -> "<app>-pr-<n>"
 *   integ   -> "bp-integ-pr-<n>-<app>"
 */
export function stackName(ctx: NameContext): string {
  validateAppSlug(ctx.app);
  assertDeployStage(ctx.stage);
  switch (ctx.stage) {
    case 'prod':
      return `${ctx.app}-prod`;
    case 'preview':
      return `${ctx.app}-${previewSuffix(ctx.prNumber)}`;
    case 'integ':
      return `${INTEG_STACK_PREFIX}-${previewSuffix(ctx.prNumber)}-${ctx.app}`;
  }
}

/**
 * S3 bucket name for the per-app prod / preview / integ bucket. Single
 * AWS account, single region, so no account/region suffix — once the name
 * is taken in this account it stays ours (RemovalPolicy.RETAIN). If the
 * literal `<app>-<stage>` ever did collide on first deploy, rename and
 * redeploy is the one-time fix.
 */
export function bucketName(ctx: NameContext): string {
  validateAppSlug(ctx.app);
  assertDeployStage(ctx.stage);
  const stagePart = ctx.stage === 'prod' ? 'prod' : previewSuffix(ctx.prNumber);
  const integPrefix = ctx.stage === 'integ' ? `${INTEG_STACK_PREFIX}-` : '';
  return `${integPrefix}${ctx.app}-${stagePart}`;
}

export function lambdaFunctionName(ctx: NameContext, handler: string): string {
  validateAppSlug(ctx.app);
  validateAppSlug(handler);
  assertDeployStage(ctx.stage);
  const stagePart = ctx.stage === 'prod' ? 'prod' : previewSuffix(ctx.prNumber);
  return `${ctx.app}-${stagePart}-${handler}`;
}

/**
 * SSM parameter paths for the per-app DSQL cluster. The cluster lives in
 * the prod stack and is looked up from preview/integ stacks via these
 * paths.
 */
export function dsqlClusterSsmPaths(app: string): {
  readonly arn: string;
  readonly endpoint: string;
} {
  validateAppSlug(app);
  return {
    arn: `/borso/${app}/dsql-cluster-arn`,
    endpoint: `/borso/${app}/dsql-cluster-endpoint`,
  };
}

/**
 * DSQL schema names — Postgres identifiers, so underscores not hyphens.
 * The cluster is per-app (see `DsqlCluster`), so schema names don't carry
 * the app prefix.
 *
 *   prod    -> "prod"
 *   preview -> "pr_<n>"
 *   integ   -> "integ_<n>"
 */
export function dsqlSchemaName(ctx: NameContext): string {
  validateAppSlug(ctx.app);
  assertDeployStage(ctx.stage);
  switch (ctx.stage) {
    case 'prod':
      return 'prod';
    case 'preview': {
      if (ctx.prNumber === undefined) {
        throw new Error('preview stage requires prNumber.');
      }
      return `pr_${ctx.prNumber}`;
    }
    case 'integ': {
      if (ctx.prNumber === undefined) {
        throw new Error('integ stage requires prNumber.');
      }
      return `integ_${ctx.prNumber}`;
    }
  }
}

/**
 * Hostname used for preview/integ frontends — both share *.preview.borso.fr.
 */
export function previewHostname(ctx: NameContext): string {
  validateAppSlug(ctx.app);
  assertDeployStage(ctx.stage);
  if (ctx.stage === 'prod') {
    throw new Error('previewHostname() is not for prod stage.');
  }
  const suffix = previewSuffix(ctx.prNumber);
  const integPrefix = ctx.stage === 'integ' ? `${INTEG_STACK_PREFIX}-` : '';
  return `${integPrefix}${ctx.app}-${suffix}.${PREVIEW_PARENT_DOMAIN}`;
}

/**
 * Hostname for the per-PR HTTP API behind a preview frontend. Mirrors
 * {@link previewHostname} with an `-api` suffix so the wildcard cert
 * `*.preview.borso.fr` covers both. The frontend points at this hostname
 * via the build-time `VITE_API_BASE` env var.
 */
export function previewApiHostname(ctx: NameContext): string {
  validateAppSlug(ctx.app);
  assertDeployStage(ctx.stage);
  if (ctx.stage === 'prod') {
    throw new Error('previewApiHostname() is not for prod stage.');
  }
  const suffix = previewSuffix(ctx.prNumber);
  const integPrefix = ctx.stage === 'integ' ? `${INTEG_STACK_PREFIX}-` : '';
  return `${integPrefix}${ctx.app}-${suffix}-api.${PREVIEW_PARENT_DOMAIN}`;
}

/**
 * Host header → S3 key prefix used by the CloudFront viewer-request function.
 * Mirrors the previewHostname() convention so changes here ripple to
 * cf-host-routing-function.ts.
 */
export function previewS3Prefix(ctx: NameContext): string {
  validateAppSlug(ctx.app);
  assertDeployStage(ctx.stage);
  if (ctx.stage === 'prod') {
    throw new Error('previewS3Prefix() is not for prod stage.');
  }
  const integPrefix = ctx.stage === 'integ' ? `${INTEG_STACK_PREFIX}/` : '';
  return `${integPrefix}${ctx.app}/${previewSuffix(ctx.prNumber)}`;
}
