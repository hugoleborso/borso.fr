import { Tags } from 'aws-cdk-lib';
import type { IConstruct } from 'constructs';
import type { Stage } from './naming.utils.js';

/**
 * The integ role's IAM policy selects resources by `IntegTest`, so the tag has
 * to be absent everywhere else rather than merely false.
 */
const STAGE_ONLY_TAGS: Readonly<Record<Stage, Readonly<Record<string, string>>>> = {
  dev: {},
  preview: {},
  integ: { IntegTest: 'true' },
  prod: {},
};

/**
 * Standard tag set applied to every resource the platform creates.
 * IAM policies on the integ + preview roles are scoped to these tags;
 * dropping or renaming a tag breaks deploys, so don't.
 *
 * @beta
 */
export interface StandardTagOptions {
  readonly app: string;
  readonly stage: Stage;
  readonly prNumber?: number;
}

export function applyStandardTags(scope: IConstruct, opts: StandardTagOptions): void {
  const tags = Tags.of(scope);
  tags.add('Project', 'borso');
  tags.add('App', opts.app);
  tags.add('Stage', opts.stage);
  tags.add('ManagedBy', 'cdk');
  if (opts.prNumber !== undefined) {
    tags.add('PrNumber', String(opts.prNumber));
  }
  for (const [name, value] of Object.entries(STAGE_ONLY_TAGS[opts.stage])) {
    tags.add(name, value);
  }
}
