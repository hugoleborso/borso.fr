import { describe, expect, it } from 'vitest';
import { isTodoListShownOnToday, TODO_LISTS } from './todo-list.core';

describe('the todo lists', () => {
  it('give each list its own file, heading and commit noun', () => {
    expect(TODO_LISTS.main).toEqual({ path: 'todo.md', heading: '# Todo', commitNoun: 'todo' });
    expect(TODO_LISTS.work).toEqual({
      path: 'todo-taff.md',
      heading: '# Todo taff',
      commitNoun: 'todo taff',
    });
  });

  it('show only the main list on the today screen', () => {
    expect(isTodoListShownOnToday('main')).toBe(true);
    expect(isTodoListShownOnToday('work')).toBe(false);
  });
});
