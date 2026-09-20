import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Template } from 'aws-cdk-lib/assertions';
import { Match } from 'aws-cdk-lib/assertions';
import { AccountRootPrincipal, Role } from 'aws-cdk-lib/aws-iam';
import { describe, expect, it } from 'vitest';
import {
  WebSocketChannel,
  type WebSocketChannelProps,
} from '../../src/constructs/web-socket-channel.js';
import { synthTemplate } from './helpers/template.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ENTRY = path.join(HERE, 'fixtures', 'handler.ts');

function synth(overrides: Partial<WebSocketChannelProps> = {}): Template {
  const props: WebSocketChannelProps = {
    app: 'test-app',
    stage: 'prod',
    entry: ENTRY,
    ...overrides,
  };
  return synthTemplate((stack) => {
    new WebSocketChannel(stack, 'Channel', props);
  });
}

// @FollowsBlueprint test-cdk-synth
describe('WebSocketChannel (prod)', () => {
  const tpl = synth();

  it('creates one WebSocket API named per the convention', () => {
    tpl.resourceCountIs('AWS::ApiGatewayV2::Api', 1);
    tpl.hasResourceProperties('AWS::ApiGatewayV2::Api', {
      Name: 'test-app-prod-websocket',
      ProtocolType: 'WEBSOCKET',
      RouteSelectionExpression: '$request.body.action',
    });
  });

  it('wires $connect, $disconnect and $default to a single Lambda integration', () => {
    tpl.resourceCountIs('AWS::ApiGatewayV2::Route', 3);
    tpl.hasResourceProperties('AWS::ApiGatewayV2::Route', { RouteKey: '$connect' });
    tpl.hasResourceProperties('AWS::ApiGatewayV2::Route', { RouteKey: '$disconnect' });
    tpl.hasResourceProperties('AWS::ApiGatewayV2::Route', { RouteKey: '$default' });
    tpl.resourceCountIs('AWS::ApiGatewayV2::Integration', 1);
    tpl.resourceCountIs('AWS::Lambda::Function', 1);
  });

  it('lets API Gateway invoke the handler', () => {
    tpl.hasResourceProperties('AWS::Lambda::Permission', {
      Action: 'lambda:InvokeFunction',
      Principal: 'apigateway.amazonaws.com',
    });
  });

  it('creates an auto-deploying stage named after the deployment stage', () => {
    tpl.resourceCountIs('AWS::ApiGatewayV2::Stage', 1);
    tpl.hasResourceProperties('AWS::ApiGatewayV2::Stage', {
      StageName: 'prod',
      AutoDeploy: true,
    });
  });

  it('gives the handler its own callback URL and the standard defaults', () => {
    tpl.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'test-app-prod-websocket',
      Runtime: 'nodejs22.x',
      Architectures: ['arm64'],
      MemorySize: 512,
      Timeout: 10,
      Environment: {
        Variables: Match.objectLike({
          STAGE: 'prod',
          APP: 'test-app',
          WEBSOCKET_CALLBACK_URL: Match.anyValue(),
        }),
      },
    });
  });

  it('outputs the wss client URL', () => {
    expect(JSON.stringify(tpl.toJSON())).toContain('wss://');
  });

  it('creates a log group for the handler', () => {
    tpl.hasResourceProperties('AWS::Logs::LogGroup', {
      LogGroupName: '/aws/lambda/test-app-prod-websocket',
    });
  });

  it('grants no connection management until a caller asks for it', () => {
    expect(JSON.stringify(tpl.toJSON())).not.toContain('execute-api:ManageConnections');
  });
});

describe('WebSocketChannel (preview)', () => {
  const tpl = synth({
    stage: 'preview',
    prNumber: 42,
    memoryMb: 256,
    timeoutSeconds: 20,
    environment: { FEATURE_FLAG: 'on' },
  });

  it('suffixes the stage name with the PR number', () => {
    tpl.hasResourceProperties('AWS::ApiGatewayV2::Stage', {
      StageName: 'preview-pr-42',
      AutoDeploy: true,
    });
  });

  it('names the handler per the preview convention and honours the overrides', () => {
    tpl.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'test-app-pr-42-websocket',
      MemorySize: 256,
      Timeout: 20,
      Environment: {
        Variables: Match.objectLike({ STAGE: 'preview', FEATURE_FLAG: 'on' }),
      },
    });
  });
});

describe('WebSocketChannel (grants)', () => {
  const tpl = synthTemplate((stack) => {
    const channel = new WebSocketChannel(stack, 'Channel', {
      app: 'test-app',
      stage: 'preview',
      prNumber: 7,
      entry: ENTRY,
    });
    const publisher = new Role(stack, 'Publisher', { assumedBy: new AccountRootPrincipal() });
    channel.grantManageConnections(publisher);
  });

  it('grants execute-api:ManageConnections scoped to this stage', () => {
    tpl.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: 'execute-api:ManageConnections',
            Effect: 'Allow',
          }),
        ]),
      }),
    });
    expect(JSON.stringify(tpl.toJSON())).toContain('/preview-pr-7/*/@connections/*');
  });
});

describe('WebSocketChannel (validation)', () => {
  it('rejects bad app slugs', () => {
    expect(() => synth({ app: 'Bad_Slug' })).toThrow();
  });

  it('rejects stage="dev"', () => {
    expect(() => synth({ stage: 'dev' })).toThrow();
  });

  it('rejects a preview stage without a PR number', () => {
    expect(() => synth({ stage: 'preview' })).toThrow();
  });
});
