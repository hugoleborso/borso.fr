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

/** CloudFormation's tag shape, for resources whose tags are written as properties. */
export interface StandardTag {
  readonly Key: string;
  readonly Value: string;
}

// @FollowsBlueprint utils-pure-module
/**
 * The standard tag set as plain pairs.
 *
 * `Tags.of()` only reaches resources CDK knows are taggable, so a raw
 * `CfnResource` has to carry the same tags in its own properties. Both callers
 * read them from here so the two forms cannot drift apart.
 *
 * @beta
 */
export function standardTagPairs(opts: StandardTagOptions): readonly StandardTag[] {
  const prNumberTags =
    opts.prNumber === undefined ? [] : [{ Key: 'PrNumber', Value: String(opts.prNumber) }];
  const stageOnlyTags = Object.entries(STAGE_ONLY_TAGS[opts.stage]).map(([name, value]) => ({
    Key: name,
    Value: value,
  }));
  return [
    { Key: 'Project', Value: 'borso' },
    { Key: 'App', Value: opts.app },
    { Key: 'Stage', Value: opts.stage },
    { Key: 'ManagedBy', Value: 'cdk' },
    ...prNumberTags,
    ...stageOnlyTags,
  ];
}

export function applyStandardTags(scope: IConstruct, opts: StandardTagOptions): void {
  const tags = Tags.of(scope);
  for (const tag of standardTagPairs(opts)) {
    tags.add(tag.Key, tag.Value);
  }
}
