/**
 * Test-only helpers for working with synthesized CFN templates.
 * Mirrors infra/cdk/test/unit/helpers/template.ts; intentionally
 * duplicated rather than shared because the workspaces are deliberately
 * isolated.
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

export function resourcesOfType(
  template: { findResources(type: string): Record<string, unknown> },
  type: string,
): readonly CfnResource[] {
  return Object.values(template.findResources(type)).filter(isCfnResource);
}
