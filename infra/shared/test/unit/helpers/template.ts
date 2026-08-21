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

export function serializeTemplateForSnapshot(template: { toJSON(): unknown }): string {
  return `${JSON.stringify(template.toJSON(), null, 2).replace(CONTENT_HASH_PATTERN, CONTENT_HASH_PLACEHOLDER)}\n`;
}
