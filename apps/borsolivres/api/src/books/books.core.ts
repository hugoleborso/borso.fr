/**
 * The reading rules of the books context: which status may carry a rating,
 * which dates a status implies, and whether a draft may be written at all.
 *
 * The status vocabulary lives here rather than in `books.schema.ts` because
 * both the table and the write rules read it, and a core file may not import
 * the schema without closing an import cycle.
 */

export const BOOK_STATUSES = ['want-to-read', 'reading', 'finished', 'abandoned'] as const;

export type BookStatus = (typeof BOOK_STATUSES)[number];

export const MINIMUM_RATING = 1;
export const MAXIMUM_RATING = 5;

/** A calendar day, `YYYY-MM-DD`, which is what the `date` columns hold. */
const CALENDAR_DAY_END_INDEX = 10;

export interface BookDraft {
  readonly title: string;
  readonly author: string;
  readonly status: BookStatus;
  readonly rating: number | null;
  readonly notes: string;
  readonly startedAt: string | null;
  readonly finishedAt: string | null;
  readonly isbn: string | null;
  readonly coverUrl: string | null;
  readonly shelfId: string | null;
}

export type BookRejectionReason = 'rating-requires-finished' | 'finished-before-started';

export type BookWriteDecision =
  | { readonly kind: 'accepted'; readonly book: BookDraft }
  | { readonly kind: 'rejected'; readonly reason: BookRejectionReason };

interface BookTimeline {
  readonly startedAt: string | null;
  readonly finishedAt: string | null;
  readonly rating: number | null;
}

export function buildCalendarDay(moment: Date): string {
  return moment.toISOString().slice(0, CALENDAR_DAY_END_INDEX);
}

/**
 * What each status implies about the reading dates and the rating.
 *
 * A book nobody has opened carries neither date, a book in progress carries a
 * start and no end, an abandoned book keeps the start it had, and only a
 * finished book keeps a rating. The defaults fall back to `today` so a reader
 * who flips a status without touching the dates still gets a truthful record.
 */
const TIMELINE_BY_STATUS: Readonly<
  Record<BookStatus, (draft: BookDraft, today: string) => BookTimeline>
> = {
  'want-to-read': () => ({ startedAt: null, finishedAt: null, rating: null }),
  reading: (draft, today) => ({
    startedAt: draft.startedAt ?? today,
    finishedAt: null,
    rating: null,
  }),
  finished: (draft, today) => ({
    startedAt: draft.startedAt,
    finishedAt: draft.finishedAt ?? today,
    rating: draft.rating,
  }),
  abandoned: (draft) => ({ startedAt: draft.startedAt, finishedAt: null, rating: null }),
};

function isRatingMisplaced(draft: BookDraft): boolean {
  return draft.rating !== null && draft.status !== 'finished';
}

function isTimelineReversed(timeline: BookTimeline): boolean {
  // Stryker disable next-line ConditionalExpression,LogicalOperator: equivalent
  // mutant. This narrows `string | null` to `string` so the comparison below
  // type-checks; at run time a `<` between a date string and `null` coerces the
  // string to NaN and is false whichever side the null is on, so removing
  // either half leaves every result unchanged and no test can tell them apart.
  if (timeline.startedAt === null || timeline.finishedAt === null) return false;
  return timeline.finishedAt < timeline.startedAt;
}

/**
 * Whether a book draft may be persisted, and the draft the repository should
 * write, which is the one handed in with the status-implied dates applied.
 */
// @FollowsBlueprint core-decision
export function decideBookWrite(draft: BookDraft, now: Date): BookWriteDecision {
  if (isRatingMisplaced(draft)) return { kind: 'rejected', reason: 'rating-requires-finished' };
  const timeline = TIMELINE_BY_STATUS[draft.status](draft, buildCalendarDay(now));
  if (isTimelineReversed(timeline)) {
    return { kind: 'rejected', reason: 'finished-before-started' };
  }
  return { kind: 'accepted', book: { ...draft, ...timeline } };
}

/**
 * The draft a partial update means, which is the stored book with every
 * supplied field replaced. Written here rather than in the service so the
 * "an absent key leaves the stored value alone" rule has a test of its own.
 */
export function mergeBookDraft(stored: BookDraft, patch: Partial<BookDraft>): BookDraft {
  return {
    title: patch.title ?? stored.title,
    author: patch.author ?? stored.author,
    status: patch.status ?? stored.status,
    notes: patch.notes ?? stored.notes,
    rating: chooseNullable(patch.rating, stored.rating),
    startedAt: chooseNullable(patch.startedAt, stored.startedAt),
    finishedAt: chooseNullable(patch.finishedAt, stored.finishedAt),
    isbn: chooseNullable(patch.isbn, stored.isbn),
    coverUrl: chooseNullable(patch.coverUrl, stored.coverUrl),
    shelfId: chooseNullable(patch.shelfId, stored.shelfId),
  };
}

/**
 * A rating on an unfinished book is two fields disagreeing, which is a
 * conflict, while a book finished before it was started is a value the server
 * understood and cannot accept.
 */
const STATUS_BY_REJECTION = {
  'rating-requires-finished': 409,
  'finished-before-started': 422,
} as const satisfies Record<BookRejectionReason, number>;

export type BookRejectionStatus = (typeof STATUS_BY_REJECTION)[BookRejectionReason];

// @FollowsBlueprint core-lookup-table
export function selectBookRejectionStatus(reason: BookRejectionReason): BookRejectionStatus {
  return STATUS_BY_REJECTION[reason];
}

/**
 * A nullable field cannot use `??`, because `null` is a value the caller may
 * be sending on purpose to clear the field and `??` would read it as absent.
 * Only an absent key leaves the stored value alone.
 */
function chooseNullable<Value>(supplied: Value | null | undefined, stored: Value | null) {
  return supplied === undefined ? stored : supplied;
}
