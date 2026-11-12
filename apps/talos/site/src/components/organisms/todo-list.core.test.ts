import { describe, expect, it } from 'vitest';
import {
  hasTodoTextChanged,
  readTodoListChoice,
  selectChosenTodoLists,
  selectQuickAddList,
  selectQuickAddPlaceholderKey,
  selectTodoListChoiceLabelKey,
  TODO_LIST_CHOICES,
  selectDueStatus,
  selectDueTone,
  describeDue,
  selectDueIcon,
  selectTodoEmptyLabelKey,
  selectTodoFilterLabelKey,
  selectVisibleTodos,
  type SchedulableTodo,
} from './todo-list.core';

const TODAY = '2026-10-05';
const TOMORROW = '2026-10-06';

const LATE: SchedulableTodo = { id: 'late', text: 'Late', done: false, dueDate: '2026-10-01' };
const UNDATED: SchedulableTodo = { id: 'undated', text: 'Undated', done: false };
const SOON: SchedulableTodo = { id: 'soon', text: 'Soon', done: false, dueDate: '2026-10-07' };
const DONE_EARLY: SchedulableTodo = {
  id: 'early',
  text: 'Early',
  done: true,
  doneOn: '2026-10-01',
};
const DONE_LATE: SchedulableTodo = {
  id: 'recent',
  text: 'Recent',
  done: true,
  doneOn: '2026-10-04',
};
const DONE_UNDATED: SchedulableTodo = { id: 'old', text: 'Old', done: true };

const ALL = [DONE_EARLY, UNDATED, DONE_UNDATED, SOON, DONE_LATE, LATE];

function translate(key: string, date: string): string {
  return `t:${key}:${date}`;
}

function formatDay(isoDay: string): string {
  return `day:${isoDay}`;
}

function listIds(todos: readonly SchedulableTodo[]): string[] {
  return todos.map((todo) => todo.id);
}

describe('selectVisibleTodos', () => {
  it('lists the open todos by due date, undated last', () => {
    expect(listIds(selectVisibleTodos(ALL, 'open'))).toEqual(['late', 'soon', 'undated']);
  });

  it('lists the done todos most recently done first, undated last', () => {
    expect(listIds(selectVisibleTodos(ALL, 'done'))).toEqual(['recent', 'early', 'old']);
  });

  it('lists every todo with the open ones before the done ones', () => {
    expect(listIds(selectVisibleTodos(ALL, 'all'))).toEqual([
      'late',
      'soon',
      'undated',
      'recent',
      'early',
      'old',
    ]);
  });

  it('puts an open todo before a done one whichever comes first', () => {
    expect(listIds(selectVisibleTodos([DONE_LATE, UNDATED], 'all'))).toEqual(['undated', 'recent']);
    expect(listIds(selectVisibleTodos([UNDATED, DONE_LATE], 'all'))).toEqual(['undated', 'recent']);
  });

  it('puts an undated open todo last whatever the order it came in', () => {
    expect(listIds(selectVisibleTodos([UNDATED, LATE], 'open'))).toEqual(['late', 'undated']);
    expect(listIds(selectVisibleTodos([LATE, UNDATED], 'open'))).toEqual(['late', 'undated']);
    expect(listIds(selectVisibleTodos([DONE_UNDATED, DONE_LATE], 'done'))).toEqual([
      'recent',
      'old',
    ]);
    expect(listIds(selectVisibleTodos([DONE_LATE, DONE_UNDATED], 'done'))).toEqual([
      'recent',
      'old',
    ]);
  });

  it('orders two dated todos whichever comes first', () => {
    expect(listIds(selectVisibleTodos([SOON, LATE], 'open'))).toEqual(['late', 'soon']);
    expect(listIds(selectVisibleTodos([LATE, SOON], 'open'))).toEqual(['late', 'soon']);
  });

  it('does not reorder the list it was given', () => {
    const given = [SOON, LATE];
    selectVisibleTodos(given, 'open');
    expect(listIds(given)).toEqual(['soon', 'late']);
  });
});

describe('selectDueStatus', () => {
  it('settles a done todo whatever its date', () => {
    expect(selectDueStatus({ done: true, dueDate: '2020-01-01' }, TODAY, TOMORROW)).toBe('settled');
  });

  it('answers none for an undated todo', () => {
    expect(selectDueStatus({ done: false }, TODAY, TOMORROW)).toBe('none');
  });

  it('flags a todo due yesterday as overdue', () => {
    expect(selectDueStatus({ done: false, dueDate: '2026-10-04' }, TODAY, TOMORROW)).toBe(
      'overdue',
    );
  });

  it('recognises today and tomorrow', () => {
    expect(selectDueStatus({ done: false, dueDate: TODAY }, TODAY, TOMORROW)).toBe('today');
    expect(selectDueStatus({ done: false, dueDate: TOMORROW }, TODAY, TOMORROW)).toBe('tomorrow');
  });

  it('answers upcoming beyond tomorrow', () => {
    expect(selectDueStatus({ done: false, dueDate: '2026-10-09' }, TODAY, TOMORROW)).toBe(
      'upcoming',
    );
  });
});

describe('the due presentation', () => {
  it('marks the urgent statuses with a clock and the others with a calendar', () => {
    expect(selectDueIcon('overdue')).toBe('clock');
    expect(selectDueIcon('today')).toBe('clock');
    expect(selectDueIcon('tomorrow')).toBe('calendar');
    expect(selectDueIcon('upcoming')).toBe('calendar');
    expect(selectDueIcon('none')).toBe('calendar');
    expect(selectDueIcon('settled')).toBe('calendar');
  });

  it('paints an overdue todo in danger and today in warning', () => {
    expect(selectDueTone('overdue')).toBe('danger');
    expect(selectDueTone('today')).toBe('warning');
    expect(selectDueTone('upcoming')).toBe('neutral');
    expect(selectDueTone('none')).toBe('neutral');
    expect(selectDueTone('tomorrow')).toBe('neutral');
    expect(selectDueTone('settled')).toBe('neutral');
  });

  it('names overdue, today and tomorrow and writes the bare date otherwise', () => {
    expect(describeDue(TODAY, 'today', translate, formatDay)).toBe(`t:todo.due.today:day:${TODAY}`);
    expect(describeDue(TOMORROW, 'tomorrow', translate, formatDay)).toBe(
      `t:todo.due.tomorrow:day:${TOMORROW}`,
    );
    expect(describeDue('2026-10-01', 'overdue', translate, formatDay)).toBe(
      't:todo.due.overdue:day:2026-10-01',
    );
    expect(describeDue('2026-10-09', 'upcoming', translate, formatDay)).toBe('day:2026-10-09');
  });

  it('describes nothing for an undated todo', () => {
    expect(describeDue(undefined, 'none', translate, formatDay)).toBeNull();
  });
});

describe('the filter labels', () => {
  it('names each filter and its empty state', () => {
    expect(selectTodoFilterLabelKey('open')).toBe('todo.filter.open');
    expect(selectTodoFilterLabelKey('done')).toBe('todo.filter.done');
    expect(selectTodoFilterLabelKey('all')).toBe('todo.filter.all');
    expect(selectTodoEmptyLabelKey('open')).toBe('todo.empty.open');
    expect(selectTodoEmptyLabelKey('done')).toBe('todo.empty.done');
    expect(selectTodoEmptyLabelKey('all')).toBe('todo.empty.all');
  });
});

describe('hasTodoTextChanged', () => {
  it('accepts a new non-empty text', () => {
    expect(hasTodoTextChanged('Envoyer', ' Envoyer le CV ')).toBe(true);
  });

  it('refuses an unchanged text once trimmed', () => {
    expect(hasTodoTextChanged('Envoyer', 'Envoyer ')).toBe(false);
  });

  it('refuses an empty text', () => {
    expect(hasTodoTextChanged('Envoyer', '   ')).toBe(false);
  });
});

describe('the choice of todo list', () => {
  it('offers the personal list, the work list, then both', () => {
    expect(TODO_LIST_CHOICES).toStrictEqual(['main', 'work', 'both']);
  });

  it('takes the choice the address asks for over the kept one', () => {
    expect(readTodoListChoice('work', 'both')).toBe('work');
    expect(readTodoListChoice('both', null)).toBe('both');
  });

  it('falls back on the kept choice when the address asks for none or an unknown one', () => {
    expect(readTodoListChoice(null, 'both')).toBe('both');
    expect(readTodoListChoice('archive', 'work')).toBe('work');
  });

  it('opens on the personal list without a known kept choice', () => {
    expect(readTodoListChoice(null, null)).toBe('main');
    expect(readTodoListChoice(null, 'archive')).toBe('main');
  });

  it('shows one list, or both with the personal one first', () => {
    expect(selectChosenTodoLists('main')).toStrictEqual(['main']);
    expect(selectChosenTodoLists('work')).toStrictEqual(['work']);
    expect(selectChosenTodoLists('both')).toStrictEqual(['main', 'work']);
  });

  it('adds to the list shown, and to the personal one when both are', () => {
    expect(selectQuickAddList('main')).toBe('main');
    expect(selectQuickAddList('work')).toBe('work');
    expect(selectQuickAddList('both')).toBe('main');
  });

  it('says where a quick add goes only when both lists are shown', () => {
    expect(selectQuickAddPlaceholderKey('main')).toBe('todo.add.placeholder');
    expect(selectQuickAddPlaceholderKey('work')).toBe('todo.add.placeholder');
    expect(selectQuickAddPlaceholderKey('both')).toBe('todo.add.placeholder-main');
  });

  it('names each choice', () => {
    expect(selectTodoListChoiceLabelKey('main')).toBe('todo.list.main');
    expect(selectTodoListChoiceLabelKey('work')).toBe('todo.list.work');
    expect(selectTodoListChoiceLabelKey('both')).toBe('todo.list.both');
  });
});
