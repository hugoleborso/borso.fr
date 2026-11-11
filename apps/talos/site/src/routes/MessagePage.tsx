import type { JSX } from 'react';
import { MessageComposer } from '../components/organisms/MessageComposer';
import { RoutineRunList } from '../components/organisms/RoutineRunList';

// @FollowsBlueprint route-list-page
export function MessagePage(): JSX.Element {
  return (
    <>
      <MessageComposer />
      <RoutineRunList />
    </>
  );
}
