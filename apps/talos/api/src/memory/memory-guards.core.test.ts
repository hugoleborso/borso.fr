import { describe, expect, it } from 'vitest';
import {
  assessReadOnlyQuery,
  describeDatabaseFailure,
  hasSecret,
  MAXIMUM_SQL_ROWS,
  selectReturnedRows,
} from './memory-guards.core';

describe('hasSecret', () => {
  it.each([
    'ghp_abcdefghijklmnop',
    'github_pat_abcdefghijkl',
    'clé sk-abcdefghijklmnop1234',
    'xoxb-1234567890-abc',
    'AKIAABCDEFGHIJKLMNOP',
    '-----BEGIN PRIVATE KEY',
    'password: hunter2',
    'Mot de passe : azerty',
  ])('refuses %s', (text) => {
    expect(hasSecret({ op: 'document.write', content: text })).toBe(true);
  });

  it('lets a company name ending in sk- through, and short sk- words', () => {
    expect(hasSecret('Spendesk-Acme a signé')).toBe(false);
    expect(hasSecret('risk-free')).toBe(false);
    expect(hasSecret('sk-court')).toBe(false);
  });

  it('walks arrays and objects and ignores numbers and nulls', () => {
    expect(hasSecret([{ items: ['ok', 'ghp_abcdefghijklmnop'] }])).toBe(true);
    expect(hasSecret({ count: 3, nothing: null, label: 'password:' })).toBe(false);
  });
});

describe('assessReadOnlyQuery', () => {
  it('accepts a select or a with query and bounds it to one row over the limit', () => {
    expect(assessReadOnlyQuery(' -- note\nselect 1;')).toEqual({
      kind: 'accepted',
      boundedQuery: `SELECT * FROM (\n-- note\nselect 1\n) AS bounded_query LIMIT ${String(MAXIMUM_SQL_ROWS + 1)}`,
    });
    expect(assessReadOnlyQuery('WITH x AS (SELECT 1) SELECT * FROM x').kind).toBe('accepted');
  });

  it('refuses anything that does not start with select or with', () => {
    expect(assessReadOnlyQuery('UPDATE memory_todo SET done = true')).toEqual({
      kind: 'refused',
      reason: 'seules les requêtes SELECT ou WITH sont permises',
    });
  });

  it('refuses a second statement', () => {
    expect(assessReadOnlyQuery('select 1; select 2')).toEqual({
      kind: 'refused',
      reason: 'une seule instruction est permise',
    });
  });

  it('refuses a forbidden keyword outside a string literal or a quoted identifier', () => {
    expect(
      assessReadOnlyQuery('with gone as (delete from memory_todo returning *) select 1'),
    ).toEqual({ kind: 'refused', reason: 'mot-clé interdit : delete' });
    expect(assessReadOnlyQuery("select set_config('search_path', 'x', false)").kind).toBe(
      'refused',
    );
    expect(assessReadOnlyQuery('select \'drop; set\' as "update" /* create */').kind).toBe(
      'accepted',
    );
  });
});

describe('selectReturnedRows', () => {
  it('keeps 500 rows and says when there were more', () => {
    const rows = Array.from({ length: MAXIMUM_SQL_ROWS + 1 }, (_unused, index) => [index]);
    expect(selectReturnedRows(rows).rows).toHaveLength(MAXIMUM_SQL_ROWS);
    expect(selectReturnedRows(rows).truncated).toBe(true);
    expect(selectReturnedRows([[1]])).toEqual({ rows: [[1]], truncated: false });
  });
});

describe('describeDatabaseFailure', () => {
  it('passes the database message through and hides anything else', () => {
    expect(describeDatabaseFailure(new Error('column "x" does not exist'))).toBe(
      'column "x" does not exist',
    );
    expect(describeDatabaseFailure('boom')).toBe('requête refusée');
  });
});
