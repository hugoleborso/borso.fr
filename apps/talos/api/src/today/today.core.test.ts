import { describe, expect, it } from 'vitest';
import { buildJournalPath, readBrief, selectTodayTodos } from './today.core';

function todo(text: string, overrides: { done?: boolean; dueDate?: string } = {}) {
  return {
    id: text,
    text,
    done: overrides.done ?? false,
    ...(overrides.dueDate === undefined ? {} : { dueDate: overrides.dueDate }),
  };
}

describe('selectTodayTodos', () => {
  it('keeps open tasks due by the horizon or undated, overdue first and undated last', () => {
    const todos = [
      todo('sans date'),
      todo('dans trois jours', { dueDate: '2026-10-08' }),
      todo('après-demain', { dueDate: '2026-10-07' }),
      todo('faite', { done: true, dueDate: '2026-10-01' }),
      todo('faite sans date', { done: true }),
      todo('demain', { dueDate: '2026-10-06' }),
      todo('en retard', { dueDate: '2026-02-13' }),
      todo('sans date bis'),
    ];
    expect(selectTodayTodos(todos, '2026-10-07').map((selected) => selected.text)).toEqual([
      'en retard',
      'demain',
      'après-demain',
      'sans date',
      'sans date bis',
    ]);
  });

  it('stops at eight tasks', () => {
    const todos = Array.from({ length: 10 }, (_, index) => todo(`t${String(index)}`));
    expect(selectTodayTodos(todos, '2026-10-07')).toHaveLength(8);
  });
});

describe('readBrief', () => {
  it('reads the sent brief section of the journal', () => {
    expect(
      readBrief(
        '2026-10-05',
        '---\ntype: journal\n---\n# 2026-10-05\n\n## Brief envoyé\n\n**Lundi**\n\n## Fait\nx',
      ),
    ).toEqual({ date: '2026-10-05', markdown: '**Lundi**' });
  });

  it('answers null when the journal or its brief is missing', () => {
    expect(readBrief('2026-10-05', '')).toBeNull();
    expect(readBrief('2026-10-05', '# 2026-10-05\n## Fait\n')).toBeNull();
  });
});

describe('buildJournalPath', () => {
  it('points at the journal of the day', () => {
    expect(buildJournalPath('2026-10-05')).toBe('journal/2026-10-05.md');
  });
});
