import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LambdaApi, type LambdaApiProps } from '../../src/constructs/lambda-api.js';
import { outputValues, synthTemplate, TEST_ENV } from './helpers/template.js';

const shellCommands = vi.hoisted((): string[] => []);

vi.mock('node:child_process', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:child_process')>();
  return {
    ...original,
    execSync: vi.fn((command: string) => {
      shellCommands.push(command);
      return Buffer.alloc(0);
    }),
  };
});

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ENTRY = path.join(HERE, 'fixtures', 'handler.ts');
const POSTGRES_ENTRY = path.join(HERE, 'fixtures', 'postgres-handler.ts');
const ORCHESTRION_POSTGRES_CHANNEL = 'orchestrion:postgres:handle';
const UPLOAD = { organization: 'borsofr', project: 'pragma', release: 'abc123' };

interface BundledAsset {
  readonly files: readonly string[];
  readonly code: string;
}

function synthBundle(overrides: Partial<LambdaApiProps> = {}): BundledAsset {
  const app = new App();
  const stack = new Stack(app, 'TestStack', { env: TEST_ENV });
  new LambdaApi(stack, 'Api', { app: 'test-app', stage: 'prod', entry: ENTRY, ...overrides });
  Template.fromStack(stack);
  const [assetDirectory] = fs
    .readdirSync(app.outdir)
    .filter((name) => name.startsWith('asset.'))
    .map((name) => path.join(app.outdir, name));
  const directory = assetDirectory ?? '';
  return {
    files: [...fs.readdirSync(directory)].sort(),
    code: fs.readFileSync(path.join(directory, 'index.mjs'), 'utf-8'),
  };
}

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
      Runtime: 'nodejs24.x',
      Handler: 'index.handler',
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

  it('allows the content-type, authorization and trace headers through the credentialed CORS preflight', () => {
    const tpl = synth({ allowedOrigins: ['https://pragma-pr-42.preview.borso.fr'] });
    tpl.hasResourceProperties('AWS::ApiGatewayV2::Api', {
      CorsConfiguration: Match.objectLike({
        AllowCredentials: true,
        AllowOrigins: ['https://pragma-pr-42.preview.borso.fr'],
        AllowHeaders: ['content-type', 'authorization', 'sentry-trace', 'baggage'],
      }),
    });
  });

  it('adds the request headers an app declares to the credentialed CORS preflight', () => {
    const tpl = synth({
      allowedOrigins: ['https://pragma-pr-42.preview.borso.fr'],
      appRequestHeaders: ['x-ballot-token'],
    });
    tpl.hasResourceProperties('AWS::ApiGatewayV2::Api', {
      CorsConfiguration: Match.objectLike({
        AllowHeaders: [
          'content-type',
          'authorization',
          'sentry-trace',
          'baggage',
          'x-ballot-token',
        ],
      }),
    });
  });

  it('rejects bad app slug', () => {
    expect(() => synth({ app: 'Bad_Slug' })).toThrow();
  });
});

describe('LambdaApi handler bundle', () => {
  afterEach(() => {
    shellCommands.length = 0;
  });

  it('rewrites the postgres driver to publish the channels Sentry turns into database spans', () => {
    expect(synthBundle({ entry: POSTGRES_ENTRY }).code).toContain(ORCHESTRION_POSTGRES_CHANNEL);
  });

  it('ships one ESM file and its map, and uploads nothing without a target', () => {
    expect(synthBundle().files).toEqual(['index.mjs', 'index.mjs.map']);
    expect(shellCommands).toEqual([]);
  });

  it('uploads the map from the bundle directory once the bundle is written', () => {
    synthBundle({ sourceMapUpload: UPLOAD });
    expect(shellCommands).toHaveLength(2);
    expect(shellCommands.at(0)).toMatch(
      /^pnpm exec sentry-cli sourcemaps inject '.+-building' \|\| true$/,
    );
    expect(shellCommands.at(1)).toContain("--org 'borsofr' --project 'pragma' --release 'abc123'");
  });
});
