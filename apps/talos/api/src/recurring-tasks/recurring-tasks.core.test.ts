import { describe, expect, it } from 'vitest';
import { parseRecurringTasks } from './recurring-tasks.core';

const TITLE_FIELD = 'titre';
const GENERATED_AT = '2026-11-11T18:06:25+01:00';

const WATCH = {
  id: 'veille-meteo',
  [TITLE_FIELD]: 'Veille météo',
  cadence: 'hebdomadaire',
  routine: 'nuit',
  quoi: 'Relever les prévisions de la semaine.',
  dernier: '2026-11-05',
  prochain: '2026-11-12',
  due: false,
};

function recurringFile(tasks: readonly unknown[], overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({ genere: GENERATED_AT, taches: tasks, ...overrides });
}

describe('parseRecurringTasks', () => {
  it('reads the French keys of the state into the English shape', () => {
    expect(parseRecurringTasks(recurringFile([WATCH]))).toStrictEqual({
      generatedAt: GENERATED_AT,
      tasks: [
        {
          id: 'veille-meteo',
          title: 'Veille météo',
          cadence: 'hebdomadaire',
          routine: 'nuit',
          what: 'Relever les prévisions de la semaine.',
          lastRunOn: '2026-11-05',
          nextRunOn: '2026-11-12',
          isDue: false,
        },
      ],
    });
  });

  it('keeps a task that never ran, with or without the key of its last run', () => {
    const { dernier: _lastRun, ...neverRan } = WATCH;
    const recurring = parseRecurringTasks(
      recurringFile([
        { ...WATCH, dernier: null, due: true },
        { ...neverRan, id: 'bilan-budget' },
      ]),
    );
    expect(recurring.tasks.map((task) => [task.id, task.lastRunOn, task.isDue])).toStrictEqual([
      ['veille-meteo', null, true],
      ['bilan-budget', null, false],
    ]);
  });

  it('keeps a cadence and a routine it does not know as written', () => {
    const [task] = parseRecurringTasks(
      recurringFile([{ ...WATCH, cadence: 'bisannuelle', routine: 'aube' }]),
    ).tasks;
    expect([task?.cadence, task?.routine]).toStrictEqual(['bisannuelle', 'aube']);
  });

  it('drops a task that does not parse and keeps the others', () => {
    const recurring = parseRecurringTasks(
      recurringFile([
        { ...WATCH, id: '' },
        { ...WATCH, [TITLE_FIELD]: '' },
        { ...WATCH, prochain: 'bientôt' },
        { ...WATCH, dernier: 'hier' },
        { ...WATCH, due: 'oui' },
        'veille',
        { ...WATCH, id: 'bilan-budget' },
      ]),
    );
    expect(recurring.tasks.map((task) => task.id)).toStrictEqual(['bilan-budget']);
  });

  it('answers no date when the state does not say when it was written', () => {
    expect(parseRecurringTasks(JSON.stringify({ taches: [WATCH] }))).toMatchObject({
      generatedAt: null,
      tasks: [{ id: 'veille-meteo' }],
    });
  });

  it('answers an empty list when the state is missing or unreadable', () => {
    const empty = { generatedAt: null, tasks: [] };
    expect(parseRecurringTasks(null)).toStrictEqual(empty);
    expect(parseRecurringTasks('{')).toStrictEqual(empty);
    expect(parseRecurringTasks(JSON.stringify({ genere: GENERATED_AT }))).toStrictEqual(empty);
    expect(parseRecurringTasks(recurringFile([WATCH], { genere: 12 }))).toStrictEqual(empty);
  });
});
