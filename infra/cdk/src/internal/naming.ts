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
 * Globally-unique S3 bucket name. Must include account + region because S3 is
 * global. Caller is responsible for producing the account/region values.
 */
export function bucketName(ctx: NameContext, region: string, account: string): string {
  validateAppSlug(ctx.app);
  assertDeployStage(ctx.stage);
  const stagePart = ctx.stage === 'prod' ? 'prod' : previewSuffix(ctx.prNumber);
  const integPrefix = ctx.stage === 'integ' ? `${INTEG_STACK_PREFIX}-` : '';
  return `${integPrefix}${ctx.app}-${stagePart}-${region}-${account}`;
}

export function lambdaFunctionName(ctx: NameContext, handler: string): string {
  validateAppSlug(ctx.app);
  validateAppSlug(handler);
  assertDeployStage(ctx.stage);
  const stagePart = ctx.stage === 'prod' ? 'prod' : previewSuffix(ctx.prNumber);
  return `${ctx.app}-${stagePart}-${handler}`;
}

/**
 * DSQL schema names — Postgres identifiers, so underscores not hyphens.
 *
 *   prod    -> "<app>"            (e.g. "borso_fr")
 *   preview -> "<app>_pr_<n>"
 *   integ   -> "integ_pr_<n>_<app>"
 */
export function dsqlSchemaName(ctx: NameContext): string {
  validateAppSlug(ctx.app);
  assertDeployStage(ctx.stage);
  const underscored = ctx.app.replace(/-/g, '_');
  switch (ctx.stage) {
    case 'prod':
      return underscored;
    case 'preview': {
      if (ctx.prNumber === undefined) {
        throw new Error('preview stage requires prNumber.');
      }
      return `${underscored}_pr_${ctx.prNumber}`;
    }
    case 'integ': {
      if (ctx.prNumber === undefined) {
        throw new Error('integ stage requires prNumber.');
      }
      return `integ_pr_${ctx.prNumber}_${underscored}`;
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
