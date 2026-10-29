export interface ListedInputSchema {
  readonly type: 'object';
  readonly [field: string]: unknown;
}

const SCHEMA_DIALECT_FIELD = '$schema';
const CLOSED_OBJECT_FIELD = 'additionalProperties';

function isNoiseField(field: string, value: unknown): boolean {
  return field === SCHEMA_DIALECT_FIELD || (field === CLOSED_OBJECT_FIELD && value === false);
}

function compactObject(value: object): Record<string, unknown> {
  const kept: Record<string, unknown> = {};
  for (const [field, nested] of Object.entries(value)) {
    if (!isNoiseField(field, nested)) kept[field] = dropNoiseFields(nested);
  }
  return kept;
}

function dropNoiseFields(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(dropNoiseFields);
  if (typeof value !== 'object' || value === null) return value;
  return compactObject(value);
}

// @FollowsBlueprint core-projection
export function compactInputSchema(schema: object): ListedInputSchema {
  return { ...compactObject(schema), type: 'object' };
}
