export const TODO_LISTS = {
  main: { commitNoun: 'todo', memoryList: 'personal' },
  work: { commitNoun: 'todo taff', memoryList: 'work' },
} as const;

export type TodoListName = keyof typeof TODO_LISTS;

export type TodoList = (typeof TODO_LISTS)[TodoListName];

const LIST_SHOWN_ON_TODAY: TodoListName = 'main';

export function isTodoListShownOnToday(list: TodoListName): boolean {
  return list === LIST_SHOWN_ON_TODAY;
}
