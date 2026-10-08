import type { JSX } from 'react';
import { useParams } from 'react-router-dom';
import { TodoDetail } from '../components/organisms/TodoDetail';

// @FollowsBlueprint route-detail-page
export function TodoDetailPage(): JSX.Element {
  const { id = '' } = useParams();
  return <TodoDetail key={id} id={id} />;
}
