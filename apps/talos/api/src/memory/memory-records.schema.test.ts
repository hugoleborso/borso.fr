import { getTableConfig } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import { memoryEventTable, memoryTodoTable } from './memory-records.schema';

describe('memory record tables', () => {
  it('indexes todos by list and events by when they happened', () => {
    expect(getTableConfig(memoryTodoTable).indexes.map((index) => index.config.name)).toEqual([
      'memory_todo_list_idx',
    ]);
    expect(getTableConfig(memoryEventTable).indexes.map((index) => index.config.name)).toEqual([
      'memory_event_occurred_at_idx',
    ]);
  });
});
