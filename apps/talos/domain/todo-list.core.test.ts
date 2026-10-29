import { describe, expect, it } from 'vitest';
import { isTodoListShownOnToday, TODO_LISTS } from './todo-list.core';

describe('the todo lists', () => {
  it('give each list its own commit noun and memory list', () => {
    expect(TODO_LISTS.main).toEqual({
      commitNoun: 'todo',
      memoryList: 'personal',
    });
    expect(TODO_LISTS.work).toEqual({
      commitNoun: 'todo taff',
      memoryList: 'work',
    });
  });

  it('show only the main list on the today screen', () => {
    expect(isTodoListShownOnToday('main')).toBe(true);
    expect(isTodoListShownOnToday('work')).toBe(false);
  });
});
