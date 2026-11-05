export interface ListedInputSchema {
  readonly type: 'object';
  readonly [field: string]: unknown;
}

const SCHEMA_DIALECT_FIELD = '$schema';
const CLOSED_OBJECT_FIELD = 'additionalProperties';
const PATTERN_FIELD = 'pattern';
const FORMAT_FIELD = 'format';
const SAFE_INTEGER_BOUNDS: ReadonlyMap<string, number> = new Map([
  ['minimum', Number.MIN_SAFE_INTEGER],
  ['maximum', Number.MAX_SAFE_INTEGER],
]);

function isNoiseField(field: string, value: unknown, hasFormat: boolean): boolean {
  if (field === SCHEMA_DIALECT_FIELD) return true;
  if (field === CLOSED_OBJECT_FIELD) return value === false;
  if (field === PATTERN_FIELD) return hasFormat;
  return SAFE_INTEGER_BOUNDS.get(field) === value;
}

function compactObject(value: object): Record<string, unknown> {
  const fields = Object.entries(value);
  const hasFormat = fields.some(
    ([field, nested]) => field === FORMAT_FIELD && typeof nested === 'string',
  );
  const kept: Record<string, unknown> = {};
  for (const [field, nested] of fields) {
    if (!isNoiseField(field, nested, hasFormat)) kept[field] = dropNoiseFields(nested);
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
