import type { JSX } from 'react';
import { useWeeklyReview } from '../../lib/queries/history.queries';
import { removeTitleLine } from './history-board.core';
import { HistoryEntry } from './HistoryEntry';

export interface WeeklyReviewViewProps {
  readonly week: string;
}

// @FollowsBlueprint organism-query-owning
export function WeeklyReviewView({ week }: WeeklyReviewViewProps): JSX.Element {
  const review = useWeeklyReview(week);
  const markdown = review.data?.markdown;
  return (
    <HistoryEntry
      entry={{
        heading: review.data?.title ?? week,
        markdown: markdown === undefined ? undefined : removeTitleLine(markdown),
        isPending: review.isPending,
        error: review.error,
        refetch: () => void review.refetch(),
        sheet: { title: review.data?.title ?? week, subject: { kind: 'review', week } },
        backTo: '/history?view=reviews',
      }}
    />
  );
}
