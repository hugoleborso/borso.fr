import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { describe, expect, it } from 'vitest';
import { applyStandardTags } from '../../src/internal/tags.js';
import { isObject, resourcesOfType } from './_helpers/template.js';

interface Tag {
  readonly Key: string;
  readonly Value: string;
}

function isTagArray(value: unknown): value is readonly Tag[] {
  return (
    Array.isArray(value) &&
    value.every((entry) => isObject(entry) && typeof entry.Key === 'string' && typeof entry.Value === 'string')
  );
}

function tagsOnFirstBucket(stack: Stack): Record<string, string> {
  const buckets = resourcesOfType(Template.fromStack(stack), 'AWS::S3::Bucket');
  for (const bucket of buckets) {
    const tags = bucket.Properties?.Tags;
    if (isTagArray(tags)) {
      return Object.fromEntries(tags.map((tag) => [tag.Key, tag.Value]));
    }
  }
  return {};
}

describe('applyStandardTags', () => {
  it('applies the base tag set', () => {
    const stack = new Stack(new App(), 'S');
    applyStandardTags(stack, { app: 'test-app', stage: 'prod' });
    new Bucket(stack, 'B');
    const tags = tagsOnFirstBucket(stack);
    expect(tags).toMatchObject({
      Project: 'borso',
      App: 'test-app',
      Stage: 'prod',
      ManagedBy: 'cdk',
    });
    expect(tags.PrNumber).toBeUndefined();
    expect(tags.IntegTest).toBeUndefined();
  });

  it('adds PrNumber when supplied', () => {
    const stack = new Stack(new App(), 'S');
    applyStandardTags(stack, { app: 'test-app', stage: 'preview', prNumber: 7 });
    new Bucket(stack, 'B');
    expect(tagsOnFirstBucket(stack)).toMatchObject({ PrNumber: '7' });
  });

  it('marks integ-stage scopes with IntegTest=true', () => {
    const stack = new Stack(new App(), 'S');
    applyStandardTags(stack, { app: 'test-app', stage: 'integ', prNumber: 9 });
    new Bucket(stack, 'B');
    expect(tagsOnFirstBucket(stack)).toMatchObject({
      IntegTest: 'true',
      Stage: 'integ',
      PrNumber: '9',
    });
  });
});
