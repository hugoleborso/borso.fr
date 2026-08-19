import { describe, expect, it } from 'vitest';
import type { TranslationKey } from '../i18n/i18n.utils';
import {
  buildFilmstripSummary,
  buildProofChipText,
  buildProofKey,
  countChallengesOfKind,
  countUnfinishedChallenges,
  deriveEditionScore,
  deriveMonthScore,
  formatMonthNumber,
  formatScore,
  isMediaProof,
  listAvailableYears,
  listChallengeNoteKeys,
  listMonthCoverImages,
  listProofLabelKeys,
  listProofSections,
  selectCompletionRatio,
  selectCurrentMonthNumber,
  selectDefaultMonthNumber,
  selectDefaultYear,
  selectEdition,
  selectFeaturedMonth,
  selectProofLabel,
} from './labours.core';
import type { Challenge, Edition, Month, Proof } from './labours.types';

const TITLE_KEY = 'twelve-labours.edition.2025.january.daily-sport.title';
const NOTE_KEY = 'twelve-labours.edition.2025.january.daily-sport.note';

function challenge(overrides: Partial<Challenge> = {}): Challenge {
  return { titleKey: TITLE_KEY, kind: 'oneshot', status: 'done', ...overrides };
}

function month(statuses: Challenge['status'][], overrides: Partial<Month> = {}): Month {
  return {
    monthNumber: 1,
    nameKey: 'common.month.january',
    challenges: statuses.map((status) => challenge({ status })),
    ...overrides,
  };
}

function photo(value: string): Proof {
  return { type: 'photo', value };
}

function translate(key: TranslationKey): string {
  return `translated:${key}`;
}

// @FollowsBlueprint test-pure-unit
describe('deriveMonthScore', () => {
  it('counts a completed challenge as one and a partial one as a half', () => {
    expect(deriveMonthScore(month(['done', 'partial', 'failed']))).toEqual({
      completed: 1.5,
      total: 3,
    });
  });

  it('counts nothing for statuses that carry no weight', () => {
    expect(deriveMonthScore(month(['failed', 'todo', 'abandoned', 'doing']))).toEqual({
      completed: 0,
      total: 4,
    });
  });

  it('returns an empty score for a month with no challenges', () => {
    expect(deriveMonthScore(month([]))).toEqual({ completed: 0, total: 0 });
  });
});

describe('deriveEditionScore', () => {
  it('sums every month of the edition', () => {
    const edition: Edition = {
      titleKey: 'twelve-labours.edition.2025.title',
      subtitleKey: 'twelve-labours.edition.2025.subtitle',
      months: [month(['done', 'partial']), month(['done', 'todo'])],
    };
    expect(deriveEditionScore(edition)).toEqual({ completed: 2.5, total: 4 });
  });

  it('returns an empty score for an edition with no months', () => {
    const edition: Edition = {
      titleKey: 'twelve-labours.edition.2025.title',
      subtitleKey: 'twelve-labours.edition.2025.subtitle',
      months: [],
    };
    expect(deriveEditionScore(edition)).toEqual({ completed: 0, total: 0 });
  });
});

describe('selectCompletionRatio', () => {
  it('divides what is completed by the total', () => {
    expect(selectCompletionRatio({ completed: 3, total: 4 })).toBe(0.75);
  });

  it('reads an empty edition as empty rather than full', () => {
    expect(selectCompletionRatio({ completed: 0, total: 0 })).toBe(0);
  });
});

describe('formatScore', () => {
  it('writes a whole number without a decimal point', () => {
    expect(formatScore(4)).toBe('4');
  });

  it('writes a half with a comma, which is the separator French uses', () => {
    expect(formatScore(4.5)).toBe('4,5');
  });

  it('rounds to a single decimal rather than carrying the rest', () => {
    expect(formatScore(4.06)).toBe('4,1');
  });
});

describe('countChallengesOfKind', () => {
  const edition: Edition = {
    titleKey: 'twelve-labours.edition.2025.title',
    subtitleKey: 'twelve-labours.edition.2025.subtitle',
    months: [
      {
        monthNumber: 1,
        nameKey: 'common.month.january',
        challenges: [
          challenge({ kind: 'daily' }),
          challenge({ kind: 'oneshot' }),
          challenge({ kind: 'count' }),
        ],
      },
      {
        monthNumber: 2,
        nameKey: 'common.month.february',
        challenges: [challenge({ kind: 'daily' })],
      },
    ],
  };

  it('counts every challenge of the requested kind across the edition', () => {
    expect(countChallengesOfKind(edition, 'daily')).toBe(2);
  });

  it('counts a kind that appears once', () => {
    expect(countChallengesOfKind(edition, 'count')).toBe(1);
  });
});

describe('countUnfinishedChallenges', () => {
  it('counts what is upcoming and what is in progress, and nothing else', () => {
    const edition: Edition = {
      titleKey: 'twelve-labours.edition.2025.title',
      subtitleKey: 'twelve-labours.edition.2025.subtitle',
      months: [month(['todo', 'doing', 'done', 'failed', 'abandoned', 'partial'])],
    };
    expect(countUnfinishedChallenges(edition)).toBe(2);
  });
});

describe('selectDefaultMonthNumber', () => {
  it('opens on the current month when the edition is the running year', () => {
    expect(selectDefaultMonthNumber(2026, new Date('2026-04-15T00:00:00Z'))).toBe(4);
  });

  it('opens on January for any other year', () => {
    expect(selectDefaultMonthNumber(2025, new Date('2026-04-15T00:00:00Z'))).toBe(1);
  });
});

describe('selectCurrentMonthNumber', () => {
  it('names the running month for the running year', () => {
    expect(selectCurrentMonthNumber(2026, new Date('2026-07-02T00:00:00Z'))).toBe(7);
  });

  it('names nothing for a past edition', () => {
    expect(selectCurrentMonthNumber(2025, new Date('2026-07-02T00:00:00Z'))).toBeNull();
  });
});

describe('listAvailableYears', () => {
  const edition: Edition = {
    titleKey: 'twelve-labours.edition.2025.title',
    subtitleKey: 'twelve-labours.edition.2025.subtitle',
    months: [],
  };

  it('returns the years as numbers, oldest first', () => {
    expect(listAvailableYears({ editions: { 2026: edition, 2025: edition } })).toEqual([
      2025, 2026,
    ]);
  });

  it('returns nothing when the data module carries no edition', () => {
    expect(listAvailableYears({ editions: {} })).toEqual([]);
  });
});

describe('formatMonthNumber', () => {
  it('pads a single digit month so it lines up with a two digit one', () => {
    expect(formatMonthNumber(3)).toBe('03');
  });

  it('leaves a two digit month alone', () => {
    expect(formatMonthNumber(11)).toBe('11');
  });
});

describe('selectDefaultYear', () => {
  it('picks the most recent edition, not the second one', () => {
    expect(selectDefaultYear([2024, 2025, 2026], 2030)).toBe(2026);
  });

  it('falls back when no year is on offer', () => {
    expect(selectDefaultYear([], 2030)).toBe(2030);
  });
});

describe('selectEdition', () => {
  const edition: Edition = {
    titleKey: 'twelve-labours.edition.2025.title',
    subtitleKey: 'twelve-labours.edition.2025.subtitle',
    months: [],
  };

  it('returns the edition of the requested year', () => {
    expect(selectEdition({ editions: { 2025: edition } }, 2025)).toBe(edition);
  });

  it('throws when no edition was written for the year', () => {
    expect(() => selectEdition({ editions: {} }, 2027)).toThrow('2027');
  });
});

describe('selectFeaturedMonth', () => {
  const january = month(['done']);
  const february = month(['done'], { monthNumber: 2, nameKey: 'common.month.february' });
  const edition: Edition = {
    titleKey: 'twelve-labours.edition.2025.title',
    subtitleKey: 'twelve-labours.edition.2025.subtitle',
    months: [january, february],
  };

  it('returns the month asked for', () => {
    expect(selectFeaturedMonth(edition, 2)).toBe(february);
  });

  it('falls back to the first month when the number matches nothing', () => {
    expect(selectFeaturedMonth(edition, 11)).toBe(january);
  });

  it('throws when the edition carries no months at all', () => {
    expect(() => selectFeaturedMonth({ ...edition, months: [] }, 1)).toThrow('no months');
  });
});

describe('listMonthCoverImages', () => {
  it('uses the explicit cover when the month names one', () => {
    const withCover = month(['done'], { coverImage: '/media/cover.jpg' });
    expect(listMonthCoverImages(withCover)).toEqual(['/media/cover.jpg']);
  });

  it('lends the first photo when the month has several', () => {
    const withPhotos: Month = {
      monthNumber: 1,
      nameKey: 'common.month.january',
      challenges: [challenge({ proofs: [photo('/media/one.jpg'), photo('/media/two.jpg')] })],
    };
    expect(listMonthCoverImages(withPhotos)).toEqual(['/media/one.jpg']);
  });

  it('keeps a lone photo for the challenge itself', () => {
    const withOnePhoto: Month = {
      monthNumber: 1,
      nameKey: 'common.month.january',
      challenges: [challenge({ proofs: [photo('/media/one.jpg')] })],
    };
    expect(listMonthCoverImages(withOnePhoto)).toEqual([]);
  });

  it('lends nothing when no challenge of the month carries a proof at all', () => {
    const withoutProofs: Month = {
      monthNumber: 1,
      nameKey: 'common.month.january',
      challenges: [challenge(), challenge()],
    };
    expect(listMonthCoverImages(withoutProofs)).toEqual([]);
  });

  it('ignores proofs that are not photos', () => {
    const withoutPhotos: Month = {
      monthNumber: 1,
      nameKey: 'common.month.january',
      challenges: [
        challenge({
          proofs: [
            { type: 'stat', value: '1' },
            { type: 'stat', value: '2' },
          ],
        }),
        challenge(),
      ],
    };
    expect(listMonthCoverImages(withoutPhotos)).toEqual([]);
  });
});

describe('listChallengeNoteKeys', () => {
  it('returns the note when the challenge carries one', () => {
    expect(listChallengeNoteKeys(challenge({ noteKey: NOTE_KEY }))).toEqual([NOTE_KEY]);
  });

  it('returns nothing when the challenge carries no note', () => {
    expect(listChallengeNoteKeys(challenge())).toEqual([]);
  });
});

describe('listProofLabelKeys', () => {
  it('returns the label when the proof carries one', () => {
    expect(
      listProofLabelKeys({
        type: 'link',
        value: 'https://example.test',
        labelKey: 'twelve-labours.proof-label.strava',
      }),
    ).toEqual(['twelve-labours.proof-label.strava']);
  });

  it('returns nothing when the proof carries no label', () => {
    expect(listProofLabelKeys(photo('/media/one.jpg'))).toEqual([]);
  });
});

describe('selectProofLabel', () => {
  it('translates the label the proof carries', () => {
    expect(
      selectProofLabel(
        {
          type: 'link',
          value: 'https://example.test',
          labelKey: 'twelve-labours.proof-label.strava',
        },
        translate,
      ),
    ).toBe('translated:twelve-labours.proof-label.strava');
  });

  it('returns nothing when the proof carries no label, so each caller picks its own fallback', () => {
    expect(selectProofLabel(photo('/media/one.jpg'), translate)).toBeNull();
  });
});

describe('isMediaProof', () => {
  it.each(['photo', 'video'] as const)('treats a %s as media', (type) => {
    expect(isMediaProof({ type, value: 'x' })).toBe(true);
  });

  it.each(['link', 'note', 'stat'] as const)('treats a %s as a chip', (type) => {
    expect(isMediaProof({ type, value: 'x' })).toBe(false);
  });
});

describe('listProofSections', () => {
  it('splits media from chips, keeping the order of each', () => {
    const mixed = challenge({
      proofs: [
        photo('/media/one.jpg'),
        { type: 'stat', value: '7 / 14' },
        { type: 'video', value: '/media/one.mp4' },
      ],
    });
    expect(listProofSections(mixed)).toEqual([
      {
        kind: 'media',
        proofs: [photo('/media/one.jpg'), { type: 'video', value: '/media/one.mp4' }],
      },
      { kind: 'chip', proofs: [{ type: 'stat', value: '7 / 14' }] },
    ]);
  });

  it('drops the chip section when there is nothing to put in it', () => {
    const mediaOnly = challenge({ proofs: [photo('/media/one.jpg')] });
    expect(listProofSections(mediaOnly).map((section) => section.kind)).toEqual(['media']);
  });

  it('returns nothing for a challenge with no proofs', () => {
    expect(listProofSections(challenge())).toEqual([]);
  });
});

describe('buildProofChipText', () => {
  it('shows the label of a link', () => {
    expect(buildProofChipText({ type: 'link', value: 'https://example.test' }, 'Strava')).toBe(
      'Strava',
    );
  });

  it('falls back to the address when a link has no label', () => {
    expect(buildProofChipText({ type: 'link', value: 'https://example.test' }, null)).toBe(
      'https://example.test',
    );
  });

  it('joins the label and the figure of a labelled statistic', () => {
    expect(buildProofChipText({ type: 'stat', value: '5h08' }, 'Temps')).toBe('Temps · 5h08');
  });

  it('shows only the figure of an unlabelled statistic', () => {
    expect(buildProofChipText({ type: 'stat', value: '7 / 14' }, null)).toBe('7 / 14');
  });

  it('shows the value of any other proof', () => {
    expect(buildProofChipText({ type: 'note', value: 'Short note' }, 'Ignored')).toBe('Short note');
  });
});

describe('buildFilmstripSummary', () => {
  it('joins the visible titles with a middle dot', () => {
    expect(buildFilmstripSummary(['One', 'Two'], 2)).toBe('One · Two');
  });

  it('counts the titles that did not fit', () => {
    expect(buildFilmstripSummary(['One', 'Two', 'Three', 'Four'], 2)).toBe('One · Two +2');
  });

  it('shows nothing extra when there are fewer titles than places', () => {
    expect(buildFilmstripSummary(['One'], 2)).toBe('One');
  });
});

describe('buildProofKey', () => {
  it('combines the challenge, the proof type and the proof value', () => {
    expect(buildProofKey(challenge(), photo('/media/one.jpg'))).toBe(
      `${TITLE_KEY}::photo::/media/one.jpg`,
    );
  });
});
