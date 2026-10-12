import type { TodoListName } from '@domain/todo-list.core';
import type { JSX } from 'react';
import { TodoBoard } from '../components/organisms/TodoBoard';

export interface TodosPageProps {
  readonly list: TodoListName;
}

// @FollowsBlueprint route-list-page
export function TodosPage({ list }: TodosPageProps): JSX.Element {
  return <TodoBoard key={list} list={list} />;
}
