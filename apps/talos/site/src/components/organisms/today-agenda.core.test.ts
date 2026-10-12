import { describe, expect, it } from 'vitest';
import {
  buildAgenda,
  countOverdueTodos,
  describeAgendaDay,
  locateAgendaRow,
  selectEarlierDay,
  selectMeanderLane,
  selectMeanderTone,
  selectOverdueDay,
  selectStationEmphasis,
} from './today-agenda.core';

const TODAY = '2026-10-08';
const TOMORROW = '2026-10-09';

function translate(key: string): string {
  return `t:${key}`;
}

function formatDay(isoDay: string): string {
  return `jour ${isoDay}`;
}

function todo(id: string, dueDate?: string, isDone = false) {
  return { id, text: id, done: isDone, ...(dueDate === undefined ? {} : { dueDate }) };
}

describe('buildAgenda', () => {
  it('groups the open todos and the dated commitments by day, overdue first and undated last', () => {
    const agenda = buildAgenda(
      [
        todo('sans-date'),
        todo('lundi', '2026-10-12'),
        todo('retard-ancien', '2026-09-01'),
        todo('aujourd-hui', TODAY),
        todo('faite', TODAY, true),
        todo('retard', '2026-10-07'),
      ],
      [
        { path: 'engagements/demain', dueDate: TOMORROW },
        { path: 'engagements/sans-date' },
        { path: 'engagements/lundi', dueDate: '2026-10-12' },
      ],
      TODAY,
      TOMORROW,
    );
    expect(
      agenda.map((day) => ({
        key: day.key,
        bucket: day.bucket,
        date: day.date,
        entries: day.entries.map((entry) => entry.key),
      })),
    ).toEqual([
      {
        key: 'overdue',
        bucket: 'overdue',
        date: undefined,
        entries: ['todo:retard-ancien', 'todo:retard'],
      },
      { key: TODAY, bucket: 'today', date: undefined, entries: ['todo:aujourd-hui'] },
      {
        key: TOMORROW,
        bucket: 'tomorrow',
        date: undefined,
        entries: ['commitment:engagements/demain'],
      },
      {
        key: '2026-10-12',
        bucket: 'later',
        date: '2026-10-12',
        entries: ['todo:lundi', 'commitment:engagements/lundi'],
      },
      { key: 'undated', bucket: 'undated', date: undefined, entries: ['todo:sans-date'] },
    ]);
  });

  it('orders two later days by date', () => {
    const agenda = buildAgenda(
      [todo('b', '2026-10-14'), todo('a', '2026-10-11')],
      [],
      TODAY,
      TOMORROW,
    );
    expect(agenda.map((day) => day.key)).toEqual(['2026-10-11', '2026-10-14']);
  });

  it('answers an empty agenda when nothing is due', () => {
    expect(buildAgenda([], [], TODAY, TOMORROW)).toEqual([]);
  });
});

describe('countOverdueTodos', () => {
  it('counts the open todos whose day has passed', () => {
    expect(
      countOverdueTodos(
        [
          todo('a', '2026-10-07'),
          todo('b', '2026-09-30'),
          todo('c', '2026-10-07', true),
          todo('d', TODAY),
          todo('e', TOMORROW),
          todo('f', '2026-10-12'),
          todo('g'),
        ],
        TODAY,
      ),
    ).toBe(2);
  });
});

describe('describeAgendaDay', () => {
  it('names the near days and formats the later ones', () => {
    expect(describeAgendaDay({ bucket: 'overdue' }, translate, formatDay)).toBe(
      't:today.agenda.overdue',
    );
    expect(describeAgendaDay({ bucket: 'today' }, translate, formatDay)).toBe(
      't:today.agenda.today',
    );
    expect(describeAgendaDay({ bucket: 'tomorrow' }, translate, formatDay)).toBe(
      't:today.agenda.tomorrow',
    );
    expect(describeAgendaDay({ bucket: 'undated' }, translate, formatDay)).toBe(
      't:today.agenda.undated',
    );
    expect(describeAgendaDay({ bucket: 'later', date: '2026-10-12' }, translate, formatDay)).toBe(
      'jour 2026-10-12',
    );
    expect(describeAgendaDay({ bucket: 'later' }, translate, formatDay)).toBe('jour ');
  });
});

describe('selectOverdueDay', () => {
  it('shows the day a todo was due only in the overdue group', () => {
    expect(selectOverdueDay('overdue', '2026-10-01', formatDay)).toBe('jour 2026-10-01');
    expect(selectOverdueDay('overdue', undefined, formatDay)).toBeNull();
    expect(selectOverdueDay('today', '2026-10-08', formatDay)).toBeNull();
  });
});

describe('selectEarlierDay', () => {
  it('keeps a day only when it is not today', () => {
    expect(selectEarlierDay('2026-10-07', TODAY)).toBe('2026-10-07');
    expect(selectEarlierDay(TODAY, TODAY)).toBeNull();
  });
});

describe('the agenda meander', () => {
  it('alternates lanes so the line turns at a right angle on every row', () => {
    expect([0, 1, 2, 3].map(selectMeanderLane)).toEqual(['inner', 'outer', 'inner', 'outer']);
  });

  it('draws the overdue and today stretch in the now tone and the rest ahead', () => {
    expect(selectMeanderTone('overdue')).toBe('now');
    expect(selectMeanderTone('today')).toBe('now');
    expect(selectMeanderTone('tomorrow')).toBe('ahead');
    expect(selectMeanderTone('later')).toBe('ahead');
    expect(selectMeanderTone('undated')).toBe('ahead');
  });

  it('rings the stations that are overdue or due today and leaves the others plain', () => {
    expect(selectStationEmphasis('overdue')).toBe('overdue');
    expect(selectStationEmphasis('today')).toBe('today');
    expect(selectStationEmphasis('tomorrow')).toBe('none');
    expect(selectStationEmphasis('later')).toBe('none');
    expect(selectStationEmphasis('undated')).toBe('none');
  });

  it('numbers headings and entries as one continuous run of rows', () => {
    const days = [{ entries: ['a', 'b'] }, { entries: ['c'] }, { entries: ['d'] }];
    expect(locateAgendaRow(days, 0, null)).toBe(0);
    expect(locateAgendaRow(days, 0, 1)).toBe(2);
    expect(locateAgendaRow(days, 1, null)).toBe(3);
    expect(locateAgendaRow(days, 1, 0)).toBe(4);
    expect(locateAgendaRow(days, 2, null)).toBe(5);
  });
});
