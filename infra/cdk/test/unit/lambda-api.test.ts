import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { describe, expect, it } from 'vitest';
import { LambdaApi, type LambdaApiProps } from '../../src/constructs/lambda-api.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ENTRY = path.join(HERE, 'fixtures', 'handler.ts');

function synth(overrides: Partial<LambdaApiProps> = {}): Template {
  const app = new App();
  const stack = new Stack(app, 'TestStack', {
    env: { account: '123456789012', region: 'eu-west-3' },
  });
  const props: LambdaApiProps = {
    app: 'pragma',
    stage: 'prod',
    entry: ENTRY,
    ...overrides,
  };
  new LambdaApi(stack, 'Api', props);
  return Template.fromStack(stack);
}

describe('LambdaApi', () => {
  it('creates one HTTP API named per the convention', () => {
    const tpl = synth();
    tpl.hasResourceProperties('AWS::ApiGatewayV2::Api', {
      Name: 'pragma-prod-api',
      ProtocolType: 'HTTP',
    });
    tpl.resourceCountIs('AWS::ApiGatewayV2::Api', 1);
  });

  it('creates exactly one Lambda function (single Hono-style entry)', () => {
    const tpl = synth();
    tpl.resourceCountIs('AWS::Lambda::Function', 1);
    tpl.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'pragma-prod-api',
      Runtime: 'nodejs22.x',
      Architectures: ['arm64'],
      ReservedConcurrentExecutions: 10,
      Environment: {
        Variables: Match.objectLike({ STAGE: 'prod', APP: 'pragma' }),
      },
    });
  });

  it('routes ANY / and ANY /{proxy+} to the single Lambda', () => {
    const tpl = synth();
    tpl.resourceCountIs('AWS::ApiGatewayV2::Route', 2);
    tpl.hasResourceProperties('AWS::ApiGatewayV2::Route', { RouteKey: 'ANY /{proxy+}' });
    tpl.hasResourceProperties('AWS::ApiGatewayV2::Route', { RouteKey: 'ANY /' });
  });

  it('attaches a single error alarm on the function', () => {
    const tpl = synth();
    tpl.resourceCountIs('AWS::CloudWatch::Alarm', 1);
  });

  it('honours customDomain in the output URL', () => {
    const tpl = synth({ customDomain: 'api.borso.fr' });
    const outputs = tpl.toJSON().Outputs ?? {};
    const values = Object.values(outputs).map((o) => (o as { Value: string }).Value);
    expect(values).toContain('https://api.borso.fr');
  });

  it('rejects bad app slug', () => {
    expect(() => synth({ app: 'Bad_Slug' })).toThrow();
  });
});
