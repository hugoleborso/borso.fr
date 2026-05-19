import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { describe, expect, it } from 'vitest';
import { buildPragmaAppStack } from '../lib/stack';

describe('pragma stack scaffold', () => {
  it('synthesises with the placeholder output', () => {
    const app = new App();
    const stack = new Stack(app, 'PragmaTestStack');
    buildPragmaAppStack({ scope: stack });
    const template = Template.fromStack(stack);
    template.hasOutput('PragmaScaffold', { Value: 'pragma-scaffold-only' });
  });

  it('does not include any Secrets Manager resource — auth state lives in the DB (ADR-0004)', () => {
    const app = new App();
    const stack = new Stack(app, 'PragmaTestStack');
    buildPragmaAppStack({ scope: stack });
    const template = Template.fromStack(stack);
    expect(template.findResources('AWS::SecretsManager::Secret')).toEqual({});
  });
});
