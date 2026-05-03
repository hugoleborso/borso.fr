/**
 * Test-only helpers for working with synthesized CFN templates.
 *
 * `aws-cdk-lib/assertions` types template properties as `any`/`unknown`,
 * which would force type assertions in every test. These helpers narrow
 * via type guards instead, keeping the tests assertion-free per the
 * repo-wide no-type-assertion rule.
 */

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

/**
 * Returns every resource of `type` in the template, as a plain array.
 * Wraps `findResources` to drop the keying-by-logical-id and to give
 * test code a stable shape.
 */
export function resourcesOfType(
  template: { findResources(type: string): Record<string, unknown> },
  type: string,
): readonly CfnResource[] {
  return Object.values(template.findResources(type)).filter(isCfnResource);
}

/** Output values from a synthesized template, narrowed to known shape. */
export function outputValues(template: { toJSON(): unknown }): readonly unknown[] {
  const json = template.toJSON();
  if (!isObject(json) || !isObject(json.Outputs)) return [];
  return Object.values(json.Outputs)
    .filter(isCfnOutput)
    .map((entry) => entry.Value);
}
