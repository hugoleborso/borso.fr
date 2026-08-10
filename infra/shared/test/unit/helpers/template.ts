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

const CONTENT_HASH_PATTERN = /\b[0-9a-f]{64}\b/g;
const CONTENT_HASH_PLACEHOLDER = '<content-hash>';

/**
 * Serialize a template for the committed snapshot, with asset content hashes
 * replaced by a placeholder.
 *
 * Bundled-asset hashes move whenever aws-cdk-lib changes how it bundles, which
 * says nothing about this stack. Every other property is compared verbatim,
 * which is the point: the drift this catches was one comment removed from the
 * CloudFront Function source, and that source ships to the edge as a string.
 */
export function serializeTemplateForSnapshot(template: { toJSON(): unknown }): string {
  return `${JSON.stringify(template.toJSON(), null, 2).replace(CONTENT_HASH_PATTERN, CONTENT_HASH_PLACEHOLDER)}\n`;
}
