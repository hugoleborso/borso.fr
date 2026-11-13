import { getTableConfig } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import { routineRunTable } from './routine.schema';

describe('routineRunTable', () => {
  it('holds the five columns of a routine run, the address alone optional', () => {
    const { name, columns } = getTableConfig(routineRunTable);
    expect(name).toBe('routine_run');
    expect(
      columns.map((column) => [column.name, column.getSQLType(), column.notNull, column.primary]),
    ).toEqual([
      ['id', 'uuid', true, true],
      ['fired_at', 'timestamp with time zone', true, false],
      ['trigger', 'text', true, false],
      ['subject', 'text', true, false],
      ['session_url', 'text', false, false],
    ]);
  });
});
