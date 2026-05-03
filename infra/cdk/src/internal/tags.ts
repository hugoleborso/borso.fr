import { Tags } from 'aws-cdk-lib';
import type { IConstruct } from 'constructs';
import type { Stage } from './naming.js';

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
  if (opts.stage === 'integ') {
    tags.add('IntegTest', 'true');
  }
}
