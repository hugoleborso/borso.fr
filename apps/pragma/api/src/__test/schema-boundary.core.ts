export const PRODUCTION_SCHEMA = 'prod';
const INSUFFICIENT_PRIVILEGE = '42501';
const UNDEFINED_TABLE = '42P01';
const INVALID_SCHEMA_NAME = '3F000';

export type SchemaBoundary = 'enforced' | 'open' | 'nothing-to-read' | 'inconclusive';

const BOUNDARY_BY_ERROR_CODE: Readonly<Record<string, SchemaBoundary>> = {
  [INSUFFICIENT_PRIVILEGE]: 'enforced',
  [UNDEFINED_TABLE]: 'nothing-to-read',
  [INVALID_SCHEMA_NAME]: 'nothing-to-read',
};

// @FollowsBlueprint core-decision
export function classifySchemaBoundary(errorCode: string | null): SchemaBoundary {
  if (errorCode === null) return 'open';
  return BOUNDARY_BY_ERROR_CODE[errorCode] ?? 'inconclusive';
}

export function readErrorCode(error: unknown): string {
  if (typeof error !== 'object' || error === null) return '';
  const code: unknown = Reflect.get(error, 'code');
  return typeof code === 'string' ? code : '';
}
