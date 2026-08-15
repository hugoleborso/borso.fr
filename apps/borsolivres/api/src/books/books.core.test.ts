import { describe, expect, it } from 'vitest';
import {
  BOOK_STATUSES,
  type BookDraft,
  type BookStatus,
  buildCalendarDay,
  decideBookWrite,
  mergeBookDraft,
  selectBookRejectionStatus,
} from './books.core';

const NOW = new Date('2026-03-14T22:31:00.000Z');
const TODAY = '2026-03-14';

function buildDraft(overrides: Partial<BookDraft> = {}): BookDraft {
  return {
    title: 'The Dispossessed',
    author: 'Ursula K. Le Guin',
    status: 'want-to-read',
    rating: null,
    notes: '',
    startedAt: null,
    finishedAt: null,
    isbn: null,
    coverUrl: null,
    shelfId: null,
    ...overrides,
  };
}

function acceptedBook(draft: BookDraft): BookDraft {
  const decision = decideBookWrite(draft, NOW);
  if (decision.kind === 'rejected') throw new Error(`expected acceptance, got ${decision.reason}`);
  return decision.book;
}

// @FollowsBlueprint test-pure-unit
describe('buildCalendarDay', () => {
  it('keeps the date half of the instant and drops the time', () => {
    expect(buildCalendarDay(NOW)).toBe(TODAY);
  });

  it('reads the day in UTC rather than in the running machine s zone', () => {
    expect(buildCalendarDay(new Date('2026-01-01T00:00:00.000Z'))).toBe('2026-01-01');
  });
});

describe('decideBookWrite', () => {
  it('clears both dates and the rating for a book nobody has opened', () => {
    const book = acceptedBook(
      buildDraft({ status: 'want-to-read', startedAt: '2026-01-01', finishedAt: '2026-02-01' }),
    );
    expect(book.startedAt).toBeNull();
    expect(book.finishedAt).toBeNull();
    expect(book.rating).toBeNull();
  });

  it('starts a book being read today when no start date was given', () => {
    const book = acceptedBook(buildDraft({ status: 'reading' }));
    expect(book.startedAt).toBe(TODAY);
    expect(book.finishedAt).toBeNull();
  });

  it('keeps the start date a book being read already carried', () => {
    const book = acceptedBook(buildDraft({ status: 'reading', startedAt: '2026-02-02' }));
    expect(book.startedAt).toBe('2026-02-02');
  });

  it('finishes a book today when no finish date was given', () => {
    const book = acceptedBook(
      buildDraft({ status: 'finished', startedAt: '2026-01-05', rating: 4 }),
    );
    expect(book.finishedAt).toBe(TODAY);
    expect(book.rating).toBe(4);
  });

  it('keeps the finish date a finished book already carried', () => {
    const book = acceptedBook(
      buildDraft({ status: 'finished', startedAt: '2026-01-05', finishedAt: '2026-01-30' }),
    );
    expect(book.finishedAt).toBe('2026-01-30');
  });

  it('keeps the start date of an abandoned book and clears its finish date', () => {
    const book = acceptedBook(
      buildDraft({ status: 'abandoned', startedAt: '2026-01-05', finishedAt: '2026-01-30' }),
    );
    expect(book.startedAt).toBe('2026-01-05');
    expect(book.finishedAt).toBeNull();
  });

  it('rejects a rating on a book that is not finished', () => {
    expect(decideBookWrite(buildDraft({ status: 'reading', rating: 5 }), NOW)).toEqual({
      kind: 'rejected',
      reason: 'rating-requires-finished',
    });
  });

  it('accepts a rating on a finished book', () => {
    expect(decideBookWrite(buildDraft({ status: 'finished', rating: 5 }), NOW).kind).toBe(
      'accepted',
    );
  });

  it('accepts a book with no rating whatever its status', () => {
    expect(decideBookWrite(buildDraft({ status: 'reading', rating: null }), NOW).kind).toBe(
      'accepted',
    );
  });

  it('rejects a finish date that falls before the start date', () => {
    expect(
      decideBookWrite(
        buildDraft({ status: 'finished', startedAt: '2026-03-01', finishedAt: '2026-02-01' }),
        NOW,
      ),
    ).toEqual({ kind: 'rejected', reason: 'finished-before-started' });
  });

  it('accepts a book finished on the day it was started', () => {
    expect(
      decideBookWrite(
        buildDraft({ status: 'finished', startedAt: '2026-02-01', finishedAt: '2026-02-01' }),
        NOW,
      ).kind,
    ).toBe('accepted');
  });

  it('accepts a finished book with no start date, since there is nothing to compare', () => {
    expect(decideBookWrite(buildDraft({ status: 'finished', startedAt: null }), NOW).kind).toBe(
      'accepted',
    );
  });

  it('accepts a book being read, whose finish date is always absent', () => {
    expect(
      decideBookWrite(buildDraft({ status: 'reading', startedAt: '2030-01-01' }), NOW).kind,
    ).toBe('accepted');
  });

  it('carries every field it was handed through to the accepted draft', () => {
    const book = acceptedBook(
      buildDraft({ notes: 'reread', isbn: '9780061054884', coverUrl: 'https://x.test/a.jpg' }),
    );
    expect(book.notes).toBe('reread');
    expect(book.isbn).toBe('9780061054884');
    expect(book.coverUrl).toBe('https://x.test/a.jpg');
  });

  it.each(BOOK_STATUSES)('answers for the %s status', (status: BookStatus) => {
    expect(decideBookWrite(buildDraft({ status }), NOW).kind).toBe('accepted');
  });
});

describe('selectBookRejectionStatus', () => {
  it('answers 409 when the rating and the status disagree', () => {
    expect(selectBookRejectionStatus('rating-requires-finished')).toBe(409);
  });

  it('answers 422 when the two dates are the wrong way round', () => {
    expect(selectBookRejectionStatus('finished-before-started')).toBe(422);
  });
});

describe('mergeBookDraft', () => {
  const stored = buildDraft({
    title: 'Stored title',
    author: 'Stored author',
    status: 'finished',
    notes: 'stored notes',
    rating: 3,
    startedAt: '2026-01-01',
    finishedAt: '2026-01-10',
    isbn: '111',
    coverUrl: 'https://x.test/stored.jpg',
    shelfId: '11111111-1111-4111-8111-111111111111',
  });

  it('leaves every field alone when the patch is empty', () => {
    expect(mergeBookDraft(stored, {})).toEqual(stored);
  });

  it('replaces each supplied text field', () => {
    expect(
      mergeBookDraft(stored, {
        title: 'New title',
        author: 'New author',
        status: 'reading',
        notes: 'new notes',
      }),
    ).toMatchObject({
      title: 'New title',
      author: 'New author',
      status: 'reading',
      notes: 'new notes',
    });
  });

  it('replaces each supplied nullable field', () => {
    expect(
      mergeBookDraft(stored, {
        rating: 5,
        startedAt: '2026-02-02',
        finishedAt: '2026-02-03',
        isbn: '222',
        coverUrl: 'https://x.test/new.jpg',
        shelfId: '22222222-2222-4222-8222-222222222222',
      }),
    ).toMatchObject({
      rating: 5,
      startedAt: '2026-02-02',
      finishedAt: '2026-02-03',
      isbn: '222',
      coverUrl: 'https://x.test/new.jpg',
      shelfId: '22222222-2222-4222-8222-222222222222',
    });
  });

  it('clears a nullable field the patch sets to null, rather than reading null as absent', () => {
    expect(
      mergeBookDraft(stored, {
        rating: null,
        startedAt: null,
        finishedAt: null,
        isbn: null,
        coverUrl: null,
        shelfId: null,
      }),
    ).toMatchObject({
      rating: null,
      startedAt: null,
      finishedAt: null,
      isbn: null,
      coverUrl: null,
      shelfId: null,
    });
  });
});
