export type Stage = 'dev' | 'preview' | 'integ' | 'prod';

type DeployStage = Exclude<Stage, 'dev'>;

const APP_SLUG_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const APP_SLUG_MAX_LENGTH = 32;

const PREVIEW_PARENT_DOMAIN = 'preview.borso.fr';
const INTEG_STACK_PREFIX = 'bp-integ';
const API_HOSTNAME_SUFFIX = '-api';

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

export function isProductionStage(stage: Stage): boolean {
  return stage === 'prod';
}

/**
 * @Blueprint construct-stage-guard
 * @BlueprintName Deploy Stage Guard
 * @BlueprintUsage Use for the first lines of any construct or naming helper that takes a stage.
 * @BlueprintDescription Declares an `asserts stage is DeployStage` return type, so one call both throws on the development stage at synth time and narrows the parameter for the rest of the function. The narrowing is what lets a following `switch` over the stage be exhaustive without a default branch, and it is why every construct calls this in its prologue rather than each one re-testing the string.
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

// @FollowsBlueprint utils-pure-module
export function stackName(context: NameContext): string {
  validateAppSlug(context.app);
  assertDeployStage(context.stage);
  switch (context.stage) {
    case 'prod':
      return `${context.app}-prod`;
    case 'preview':
      return `${context.app}-${previewSuffix(context.prNumber)}`;
    case 'integ':
      return `${INTEG_STACK_PREFIX}-${previewSuffix(context.prNumber)}-${context.app}`;
  }
}

export function bucketName(context: NameContext): string {
  validateAppSlug(context.app);
  assertDeployStage(context.stage);
  const stagePart = context.stage === 'prod' ? 'prod' : previewSuffix(context.prNumber);
  const integPrefix = context.stage === 'integ' ? `${INTEG_STACK_PREFIX}-` : '';
  return `${integPrefix}${context.app}-${stagePart}`;
}

export function lambdaFunctionName(context: NameContext, handler: string): string {
  validateAppSlug(context.app);
  validateAppSlug(handler);
  assertDeployStage(context.stage);
  const stagePart = context.stage === 'prod' ? 'prod' : previewSuffix(context.prNumber);
  return `${context.app}-${stagePart}-${handler}`;
}

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

export function dsqlSchemaName(context: NameContext): string {
  validateAppSlug(context.app);
  assertDeployStage(context.stage);
  switch (context.stage) {
    case 'prod':
      return 'prod';
    case 'preview': {
      if (context.prNumber === undefined) {
        throw new Error('preview stage requires prNumber.');
      }
      return `pr_${context.prNumber}`;
    }
    case 'integ': {
      if (context.prNumber === undefined) {
        throw new Error('integ stage requires prNumber.');
      }
      return `integ_${context.prNumber}`;
    }
  }
}

export function previewHostname(context: NameContext): string {
  validateAppSlug(context.app);
  assertDeployStage(context.stage);
  if (context.stage === 'prod') {
    throw new Error('previewHostname() is not for prod stage.');
  }
  const suffix = previewSuffix(context.prNumber);
  const integPrefix = context.stage === 'integ' ? `${INTEG_STACK_PREFIX}-` : '';
  return `${integPrefix}${context.app}-${suffix}.${PREVIEW_PARENT_DOMAIN}`;
}

export function frontendOrigin(context: NameContext, domainName: string | undefined): string {
  if (context.stage === 'prod') {
    if (domainName === undefined) {
      throw new Error('frontendOrigin() requires domainName for the prod stage.');
    }
    return `https://${domainName}`;
  }
  return `https://${previewHostname(context)}`;
}

export function previewApiHostname(context: NameContext): string {
  validateAppSlug(context.app);
  assertDeployStage(context.stage);
  if (context.stage === 'prod') {
    throw new Error('previewApiHostname() is not for prod stage.');
  }
  const suffix = previewSuffix(context.prNumber);
  const integPrefix = context.stage === 'integ' ? `${INTEG_STACK_PREFIX}-` : '';
  return `${integPrefix}${context.app}-${suffix}${API_HOSTNAME_SUFFIX}.${PREVIEW_PARENT_DOMAIN}`;
}

export function previewS3Prefix(context: NameContext): string {
  validateAppSlug(context.app);
  assertDeployStage(context.stage);
  if (context.stage === 'prod') {
    throw new Error('previewS3Prefix() is not for prod stage.');
  }
  const integPrefix = context.stage === 'integ' ? `${INTEG_STACK_PREFIX}/` : '';
  return `${integPrefix}${context.app}/${previewSuffix(context.prNumber)}`;
}
