import type { ParseKeys } from 'i18next';
import { formatLongDay } from '../../lib/calendar-day.utils';
import type { DiscussionSubjectReference } from '../../lib/discussion-subject.core';
import type { IconName } from '../atoms/Icon';

export const HISTORY_FILTERS = ['briefs', 'reviews'] as const;

export type HistoryFilter = (typeof HISTORY_FILTERS)[number];

const HISTORY_FILTER_LABEL_KEYS = {
  briefs: 'history.filter.briefs',
  reviews: 'history.filter.reviews',
} as const satisfies Record<HistoryFilter, ParseKeys>;
const DEFAULT_FILTER: HistoryFilter = 'briefs';

// @FollowsBlueprint core-view-intent
export function readHistoryFilter(parameter: string | null): HistoryFilter {
  return HISTORY_FILTERS.find((filter) => filter === parameter) ?? DEFAULT_FILTER;
}

export function selectHistoryFilterLabelKey(
  filter: HistoryFilter,
): (typeof HISTORY_FILTER_LABEL_KEYS)[HistoryFilter] {
  return HISTORY_FILTER_LABEL_KEYS[filter];
}

export function buildBriefHref(date: string): string {
  return `/history/briefs/${date}`;
}

export function buildReviewHref(week: string): string {
  return `/history/reviews/${week}`;
}

const LINE_BREAK = '\n';
const TITLE_PREFIX = '# ';

export function removeTitleLine(markdown: string): string {
  const lines = markdown.split(LINE_BREAK);
  const titleIndex = lines.findIndex((line) => line.startsWith(TITLE_PREFIX));
  return titleIndex === -1 ? markdown : lines.toSpliced(titleIndex, 1).join(LINE_BREAK);
}

export interface HistoryIndexShape {
  readonly briefs: readonly { readonly date: string }[];
  readonly reviews: readonly { readonly week: string; readonly title: string }[];
}

export interface HistoryRowIntent {
  readonly key: string;
  readonly href: string;
  readonly icon: IconName;
  readonly title: string;
  readonly caption?: string;
  readonly isBrief: boolean;
  readonly subject: DiscussionSubjectReference;
}

export function selectHistoryRows(
  index: HistoryIndexShape,
  filter: HistoryFilter,
  locale: string,
): HistoryRowIntent[] {
  if (filter === 'reviews') {
    return index.reviews.map((review) => ({
      key: review.week,
      href: buildReviewHref(review.week),
      icon: 'book',
      title: review.title,
      isBrief: false,
      subject: { kind: 'review', week: review.week },
    }));
  }
  return index.briefs.map((brief) => ({
    key: brief.date,
    href: buildBriefHref(brief.date),
    icon: 'today',
    title: formatLongDay(brief.date, locale),
    caption: brief.date,
    isBrief: true,
    subject: { kind: 'journal', date: brief.date },
  }));
}

const NOT_FOUND_STATUS = 404;

export interface HistoryEntryDisplay {
  readonly isMissing: boolean;
  readonly isWaiting: boolean;
}

function isNotFoundFailure(failure: unknown): boolean {
  return (
    typeof failure === 'object' &&
    failure !== null &&
    'status' in failure &&
    failure.status === NOT_FOUND_STATUS
  );
}

export function selectHistoryEntryDisplay(
  markdown: string | undefined,
  failure: unknown,
): HistoryEntryDisplay {
  const isMissing = isNotFoundFailure(failure);
  return { isMissing, isWaiting: markdown === undefined && !isMissing };
}
