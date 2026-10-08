import { describe, expect, it } from 'vitest';
import { buildJournalPath, readBrief, selectRecentActivity, selectTodayTodos } from './today.core';

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

  it('keeps every dated task but five undated ones at most', () => {
    const undated = Array.from({ length: 7 }, (_, index) => todo(`t${String(index)}`));
    const dated = Array.from({ length: 7 }, (_, index) =>
      todo(`d${String(index)}`, { dueDate: '2026-10-06' }),
    );
    expect(selectTodayTodos([...undated, ...dated], '2026-10-07')).toHaveLength(12);
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

describe('selectRecentActivity', () => {
  it('lists the journal sections newest first, today before yesterday, without the brief', () => {
    const today =
      '---\ntype: journal\n---\n# 2026-10-05\n## Brief envoyé\nx\n## Scan (08:00)\n## Collecte Mac (09:10)\n##  \n';
    const yesterday = '# 2026-10-04\n## Scan (18:00)\n';
    expect(
      selectRecentActivity([
        { date: '2026-10-05', journal: today },
        { date: '2026-10-04', journal: yesterday },
      ]),
    ).toEqual([
      { date: '2026-10-05', heading: 'Collecte Mac (09:10)' },
      { date: '2026-10-05', heading: 'Scan (08:00)' },
      { date: '2026-10-04', heading: 'Scan (18:00)' },
    ]);
  });

  it('stops at six entries', () => {
    const journal = Array.from({ length: 8 }, (_, index) => `## Scan ${String(index)}`).join('\n');
    expect(selectRecentActivity([{ date: '2026-10-05', journal }])).toHaveLength(6);
  });
});

describe('buildJournalPath', () => {
  it('points at the journal of the day', () => {
    expect(buildJournalPath('2026-10-05')).toBe('journal/2026-10-05.md');
  });
});
