import { z } from 'zod';

const SECRET_PATTERNS: readonly RegExp[] = [
  /ghp_[A-Za-z0-9]{8,}/,
  /github_pat_[A-Za-z0-9_]{8,}/,
  /\bsk-[A-Za-z0-9]{16,}/,
  /xox[bap]-[A-Za-z0-9-]{8,}/,
  /AKIA[0-9A-Z]{16}/,
  /-----BEGIN/,
  /(?:password|mot de passe)\s*:\s*\S/i,
];

const BLOCK_COMMENT_PATTERN = /\/\*[\s\S]*?\*\//g;
const LINE_COMMENT_PATTERN = /--[^\n]*/g;
const databaseFailureSchema = z.object({ message: z.string() });
const STRING_LITERAL_PATTERN = /'(?:[^']|'')*'/g;
const QUOTED_IDENTIFIER_PATTERN = /"(?:[^"]|"")*"/g;
const TRAILING_SEMICOLONS_PATTERN = /;\s*$/;
const READ_STATEMENT_PATTERN = /^(?:select|with)\b/i;
const FORBIDDEN_KEYWORDS = [
  'insert',
  'update',
  'delete',
  'drop',
  'alter',
  'create',
  'grant',
  'revoke',
  'truncate',
  'copy',
  'call',
  'do',
  'set',
  'set_config',
  'pg_sleep',
  'pg_read_file',
  'pg_terminate_backend',
  'pg_cancel_backend',
  'lo_import',
  'lo_export',
] as const;
const FORBIDDEN_KEYWORD_PATTERN = new RegExp(`\\b(?:${FORBIDDEN_KEYWORDS.join('|')})\\b`, 'i');
export const MAXIMUM_SQL_ROWS = 500;

export type SqlAssessment =
  | { readonly kind: 'accepted'; readonly boundedQuery: string }
  | { readonly kind: 'refused'; readonly reason: string };

function listStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(listStrings);
  if (value !== null && typeof value === 'object') return Object.values(value).flatMap(listStrings);
  return [];
}

export function hasSecret(value: unknown): boolean {
  return listStrings(value).some((text) => SECRET_PATTERNS.some((pattern) => pattern.test(text)));
}

function stripCommentsAndLiterals(query: string): string {
  return query
    .replace(STRING_LITERAL_PATTERN, "''")
    .replace(QUOTED_IDENTIFIER_PATTERN, '""')
    .replace(BLOCK_COMMENT_PATTERN, ' ')
    .replace(LINE_COMMENT_PATTERN, ' ');
}

export function assessReadOnlyQuery(query: string): SqlAssessment {
  const skeleton = stripCommentsAndLiterals(query).trim().replace(TRAILING_SEMICOLONS_PATTERN, '');
  if (!READ_STATEMENT_PATTERN.test(skeleton)) {
    return { kind: 'refused', reason: 'seules les requêtes SELECT ou WITH sont permises' };
  }
  if (skeleton.includes(';')) {
    return { kind: 'refused', reason: 'une seule instruction est permise' };
  }
  const forbidden = FORBIDDEN_KEYWORD_PATTERN.exec(skeleton);
  if (forbidden !== null) {
    return { kind: 'refused', reason: `mot-clé interdit : ${forbidden[0].toLowerCase()}` };
  }
  const statement = query.trim().replace(TRAILING_SEMICOLONS_PATTERN, '');
  return {
    kind: 'accepted',
    boundedQuery: `SELECT * FROM (\n${statement}\n) AS bounded_query LIMIT ${String(MAXIMUM_SQL_ROWS + 1)}`,
  };
}

export function selectReturnedRows(rows: readonly unknown[][]): {
  readonly rows: unknown[][];
  readonly truncated: boolean;
} {
  return { rows: rows.slice(0, MAXIMUM_SQL_ROWS), truncated: rows.length > MAXIMUM_SQL_ROWS };
}

export function describeDatabaseFailure(failure: unknown): string {
  const described = databaseFailureSchema.safeParse(failure);
  return described.success ? described.data.message : 'requête refusée';
}
