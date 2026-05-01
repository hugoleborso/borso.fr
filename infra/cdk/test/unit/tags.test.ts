import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { describe, expect, it } from 'vitest';
import { applyStandardTags } from '../../src/internal/tags.js';

interface Tag {
  readonly Key: string;
  readonly Value: string;
}

function tagsOnFirstBucket(stack: Stack): Record<string, string> {
  const tpl = Template.fromStack(stack).toJSON();
  const resources = tpl.Resources as Record<
    string,
    { Type: string; Properties?: { Tags?: Tag[] } }
  >;
  for (const r of Object.values(resources)) {
    if (r.Type === 'AWS::S3::Bucket' && r.Properties?.Tags) {
      return Object.fromEntries(r.Properties.Tags.map((t) => [t.Key, t.Value]));
    }
  }
  return {};
}

describe('applyStandardTags', () => {
  it('applies the base tag set', () => {
    const stack = new Stack(new App(), 'S');
    applyStandardTags(stack, { app: 'pragma', stage: 'prod' });
    new Bucket(stack, 'B');
    const tags = tagsOnFirstBucket(stack);
    expect(tags).toMatchObject({
      Project: 'borso',
      App: 'pragma',
      Stage: 'prod',
      ManagedBy: 'cdk',
    });
    expect(tags.PrNumber).toBeUndefined();
    expect(tags.IntegTest).toBeUndefined();
  });

  it('adds PrNumber when supplied', () => {
    const stack = new Stack(new App(), 'S');
    applyStandardTags(stack, { app: 'pragma', stage: 'preview', prNumber: 7 });
    new Bucket(stack, 'B');
    expect(tagsOnFirstBucket(stack)).toMatchObject({ PrNumber: '7' });
  });

  it('marks integ-stage scopes with IntegTest=true', () => {
    const stack = new Stack(new App(), 'S');
    applyStandardTags(stack, { app: 'pragma', stage: 'integ', prNumber: 9 });
    new Bucket(stack, 'B');
    expect(tagsOnFirstBucket(stack)).toMatchObject({
      IntegTest: 'true',
      Stage: 'integ',
      PrNumber: '9',
    });
  });
});
