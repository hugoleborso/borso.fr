export const TODO_LISTS = {
  main: { path: 'todo.md', heading: '# Todo', commitNoun: 'todo' },
  work: { path: 'todo-taff.md', heading: '# Todo taff', commitNoun: 'todo taff' },
} as const;

export type TodoListName = keyof typeof TODO_LISTS;

export type TodoList = (typeof TODO_LISTS)[TodoListName];

const LIST_SHOWN_ON_TODAY: TodoListName = 'main';

export function isTodoListShownOnToday(list: TodoListName): boolean {
  return list === LIST_SHOWN_ON_TODAY;
}
