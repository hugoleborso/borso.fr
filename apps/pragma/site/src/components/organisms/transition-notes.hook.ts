/** @Feature setlists */

import { useMemo } from 'react';
import { useTransitionCommentsList } from '../../lib/queries/transitions.queries';
import { indexTransitionComments } from './transition-view.core';

const NO_ROWS: readonly never[] = [];

// @FollowsBlueprint hook-stateful-helper
export function useTransitionNotesByPair(): Readonly<Record<string, string>> {
  const commentsQuery = useTransitionCommentsList();
  return useMemo(
    () => indexTransitionComments(commentsQuery.data?.comments ?? NO_ROWS),
    [commentsQuery.data],
  );
}
