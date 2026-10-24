import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '../../i18n/i18n.setup';
import { TakeList } from './TakeList';
import type { ListedTakeSummary, SessionSummary, TakeListRow } from './take-list.core';

const PRACTICE_SESSION: SessionSummary = { id: 'session-1', kind: 'practice', venue: null };
const LISTED_TAKE: ListedTakeSummary = {
  id: 'take-1',
  recordedAt: '2026-10-24T18:00:00.000Z',
  sessionId: PRACTICE_SESSION.id,
  durationSeconds: 17,
  authorName: 'Hugo',
  commentCount: 0,
};
const LISTED_ROW: TakeListRow<ListedTakeSummary> = {
  kind: 'listed',
  id: LISTED_TAKE.id,
  recordedAt: LISTED_TAKE.recordedAt,
  take: LISTED_TAKE,
};
const ELLIPSIS_CLASSES = ['truncate', 'text-ellipsis', 'whitespace-nowrap'];

afterEach(cleanup);

describe('TakeList', () => {
  it('shows every fact of a take row whole, wrapping instead of hiding them behind an ellipsis', () => {
    render(
      <TakeList
        rows={[LISTED_ROW]}
        sessions={[PRACTICE_SESSION]}
        selectedTakeId={null}
        onSelect={vi.fn()}
        onRetry={vi.fn()}
      />,
    );

    const summary = screen.getByText(/Practice · 0:17 · Hugo$/);
    for (const ellipsisClass of ELLIPSIS_CLASSES) {
      expect(summary.classList.contains(ellipsisClass)).toBe(false);
    }
    expect(summary.classList.contains('break-words')).toBe(true);
  });
});
