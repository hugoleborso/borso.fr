import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Template } from 'aws-cdk-lib/assertions';
import { Match } from 'aws-cdk-lib/assertions';
import { describe, expect, it } from 'vitest';
import { LambdaApi, type LambdaApiProps } from '../../src/constructs/lambda-api.js';
import { outputValues, synthTemplate } from './helpers/template.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ENTRY = path.join(HERE, 'fixtures', 'handler.ts');

function synth(overrides: Partial<LambdaApiProps> = {}): Template {
  const props: LambdaApiProps = {
    app: 'test-app',
    stage: 'prod',
    entry: ENTRY,
    ...overrides,
  };
  return synthTemplate((stack) => {
    new LambdaApi(stack, 'Api', props);
  });
}

// @FollowsBlueprint test-cdk-synth
describe('LambdaApi', () => {
  it('creates one HTTP API named per the convention', () => {
    const tpl = synth();
    tpl.hasResourceProperties('AWS::ApiGatewayV2::Api', {
      Name: 'test-app-prod-api',
      ProtocolType: 'HTTP',
    });
    tpl.resourceCountIs('AWS::ApiGatewayV2::Api', 1);
  });

  it('creates exactly one Lambda function (single Hono-style entry)', () => {
    const tpl = synth();
    tpl.resourceCountIs('AWS::Lambda::Function', 1);
    tpl.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'test-app-prod-api',
      Runtime: 'nodejs22.x',
      Architectures: ['arm64'],
      ReservedConcurrentExecutions: 10,
      Environment: {
        Variables: Match.objectLike({ STAGE: 'prod', APP: 'test-app' }),
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
    const tpl = synth({
      customDomain: {
        hostname: 'api.borso.fr',
        certificateArn: 'arn:aws:acm:eu-west-3:123456789012:certificate/aaaa-bbbb',
        hostedZoneId: 'Z000000000000ABCDEFGH',
        hostedZoneName: 'borso.fr',
      },
    });
    expect(outputValues(tpl)).toContain('https://api.borso.fr');
    tpl.hasResourceProperties('AWS::ApiGatewayV2::DomainName', { DomainName: 'api.borso.fr' });
    tpl.hasResourceProperties('AWS::ApiGatewayV2::ApiMapping', Match.objectLike({}));
    tpl.resourceCountIs('AWS::Route53::RecordSet', 2);
  });

  it('allows the ballot-token header through the credentialed CORS preflight', () => {
    const tpl = synth({ allowedOrigins: ['https://pragma-pr-42.preview.borso.fr'] });
    tpl.hasResourceProperties('AWS::ApiGatewayV2::Api', {
      CorsConfiguration: Match.objectLike({
        AllowCredentials: true,
        AllowOrigins: ['https://pragma-pr-42.preview.borso.fr'],
        AllowHeaders: ['content-type', 'authorization', 'x-ballot-token'],
      }),
    });
  });

  it('rejects bad app slug', () => {
    expect(() => synth({ app: 'Bad_Slug' })).toThrow();
  });
});
