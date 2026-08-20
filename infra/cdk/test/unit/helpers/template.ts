import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';

export const TEST_ENV = { account: '123456789012', region: 'eu-west-3' } as const;

export function synthTemplate(setup: (stack: Stack) => void): Template {
  const app = new App();
  const stack = new Stack(app, 'TestStack', { env: TEST_ENV });
  setup(stack);
  return Template.fromStack(stack);
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

interface CfnResource {
  readonly Type: string;
  readonly Properties?: Record<string, unknown>;
}

function isCfnResource(value: unknown): value is CfnResource {
  return isObject(value) && typeof value.Type === 'string';
}

interface CfnOutput {
  readonly Value: unknown;
}

function isCfnOutput(value: unknown): value is CfnOutput {
  return isObject(value) && 'Value' in value;
}

export function resourcesOfType(
  template: { findResources(type: string): Record<string, unknown> },
  type: string,
): readonly CfnResource[] {
  return Object.values(template.findResources(type)).filter(isCfnResource);
}

export function outputValues(template: { toJSON(): unknown }): readonly unknown[] {
  const json = template.toJSON();
  if (!isObject(json) || !isObject(json.Outputs)) return [];
  return Object.values(json.Outputs)
    .filter(isCfnOutput)
    .map((entry) => entry.Value);
}
