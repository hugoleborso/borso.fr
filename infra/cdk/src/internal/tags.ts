import { Tags } from 'aws-cdk-lib';
import type { IConstruct } from 'constructs';
import type { Stage } from './naming.utils.js';

const STAGE_ONLY_TAGS: Readonly<Record<Stage, Readonly<Record<string, string>>>> = {
  dev: {},
  preview: {},
  integ: { IntegTest: 'true' },
  prod: {},
};

export interface StandardTagOptions {
  readonly app: string;
  readonly stage: Stage;
  readonly prNumber?: number;
}

export interface StandardTag {
  readonly Key: string;
  readonly Value: string;
}

// @FollowsBlueprint utils-pure-module
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
