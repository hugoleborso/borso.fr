import { App, Stack } from 'aws-cdk-lib';
import { describe, expect, it } from 'vitest';
import { AGENT_READER_IAM_USER, agentReaderPrincipalArn } from './principal.utils.js';

const ACCOUNT = '123456789012';

// @FollowsBlueprint test-cdk-synth
describe('agentReaderPrincipalArn', () => {
  it('names the AI-Dev-ReadOnly IAM user of the stack account, with no region', () => {
    const stack = new Stack(new App(), 'S', { env: { account: ACCOUNT, region: 'eu-west-3' } });
    expect(stack.resolve(agentReaderPrincipalArn(stack))).toStrictEqual({
      'Fn::Join': [
        '',
        ['arn:', { Ref: 'AWS::Partition' }, `:iam::${ACCOUNT}:user/${AGENT_READER_IAM_USER}`],
      ],
    });
  });
});
