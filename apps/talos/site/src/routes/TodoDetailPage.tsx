import type { TodoListName } from '@domain/todo-list.core';
import type { JSX } from 'react';
import { useParams } from 'react-router-dom';
import { TodoDetail } from '../components/organisms/TodoDetail';

export interface TodoDetailPageProps {
  readonly list: TodoListName;
}

// @FollowsBlueprint route-detail-page
export function TodoDetailPage({ list }: TodoDetailPageProps): JSX.Element {
  const { id = '' } = useParams();
  return <TodoDetail key={`${list}:${id}`} id={id} list={list} />;
}
