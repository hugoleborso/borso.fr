import { describe, expect, it } from 'vitest';
import {
  selectFeaturedArticleClassName,
  selectFilmstripBarColor,
  selectFilmstripCardBorderClassName,
  selectFilmstripCardColors,
  selectKindLabelKey,
  selectMediaProofType,
  selectProofChipShape,
  selectProofIcon,
  selectStatusLabelKey,
  selectStatusTagColors,
  selectYearButtonColors,
} from './labours-appearance.core';
import type { ChallengeKind, ChallengeStatus, ProofType } from './labours.types';

const EVERY_STATUS: ChallengeStatus[] = ['done', 'partial', 'failed', 'abandoned', 'doing', 'todo'];
const EVERY_KIND: ChallengeKind[] = ['daily', 'count', 'oneshot'];
const EVERY_PROOF_TYPE: ProofType[] = ['photo', 'video', 'link', 'note', 'stat'];

/**
 * @Blueprint test-exhaustive-domain
 * @BlueprintName Exhaustive Domain Test
 * @BlueprintUsage Use for a function whose whole behaviour is a lookup keyed by a domain union, where every member has to be exercised.
 * @BlueprintDescription Declares one array per domain union at the top of the file, typed as that union so a new member is a typecheck failure until the array names it, then drives each array through `it.each` with the case name interpolated into the test title. Every branch of the record runs from a single assertion, which is how the lookup reaches full branch coverage without a case written by hand per member and without a loop that reports one passing test whatever it covered.
 */
describe('selectStatusLabelKey', () => {
  it.each(EVERY_STATUS)('names a catalogue key for "%s"', (status) => {
    expect(selectStatusLabelKey(status)).toBe(`twelve-labours.status.${status}`);
  });
});

describe('selectKindLabelKey', () => {
  it.each(EVERY_KIND)('names a catalogue key for "%s"', (kind) => {
    expect(selectKindLabelKey(kind)).toBe(`twelve-labours.kind.${kind}`);
  });
});

describe('selectStatusTagColors', () => {
  it('reverses the tag for the challenge in progress', () => {
    const colors = selectStatusTagColors('doing');
    expect(colors.background).toBe('var(--color-labours-accent)');
    expect(colors.borderColor).toBe('var(--color-labours-accent)');
    expect(colors.foreground).toBe('var(--color-labours-paper)');
  });

  it('draws every other status as an outline in its own ink', () => {
    const colors = selectStatusTagColors('failed');
    expect(colors.background).toBe('transparent');
    expect(colors.borderColor).toBe(colors.foreground);
  });

  it.each(EVERY_STATUS)('gives "%s" a foreground colour', (status) => {
    expect(selectStatusTagColors(status).foreground).toMatch(/^var\(--color-labours-[a-z-]+\)$/);
  });
});

describe('selectFilmstripBarColor', () => {
  it('keeps the same colour whether or not the card is active, for a settled status', () => {
    expect(selectFilmstripBarColor('done', true)).toBe(selectFilmstripBarColor('done', false));
  });

  it('darkens an abandoned bar on the active card', () => {
    expect(selectFilmstripBarColor('abandoned', true)).toBe(
      'var(--color-labours-abandoned-bar-dark)',
    );
    expect(selectFilmstripBarColor('abandoned', false)).toBe(
      'var(--color-labours-abandoned-bar-light)',
    );
  });

  it('darkens an upcoming bar on the active card', () => {
    expect(selectFilmstripBarColor('todo', true)).toBe('var(--color-labours-active-rule)');
    expect(selectFilmstripBarColor('todo', false)).toBe('var(--color-labours-stripe)');
  });
});

describe('selectProofIcon', () => {
  it.each(EVERY_PROOF_TYPE)('gives "%s" a single glyph', (type) => {
    expect(selectProofIcon(type)).toHaveLength(1);
  });
});

describe('selectMediaProofType', () => {
  it('renders a video with the video player', () => {
    expect(selectMediaProofType('video')).toBe('video');
  });

  it.each(['photo', 'link', 'note', 'stat'] as const)(
    'renders "%s" with the still image renderer',
    (type) => {
      expect(selectMediaProofType(type)).toBe('photo');
    },
  );
});

describe('selectProofChipShape', () => {
  it('shapes a link as an anchor', () => {
    expect(selectProofChipShape('link')).toBe('link');
  });

  it.each(['photo', 'video', 'note', 'stat'] as const)('shapes "%s" as plain text', (type) => {
    expect(selectProofChipShape(type)).toBe('plain');
  });
});

describe('selectFilmstripCardColors', () => {
  it('inverts the active card', () => {
    const active = selectFilmstripCardColors(true);
    const inactive = selectFilmstripCardColors(false);
    expect(active.background).toBe('var(--color-labours-ink)');
    expect(inactive.background).toBe('transparent');
    expect(active.secondaryOpacity).toBeGreaterThan(inactive.secondaryOpacity);
  });
});

describe('selectFeaturedArticleClassName', () => {
  it('gives the cover a column of its own once the page is wide enough', () => {
    expect(selectFeaturedArticleClassName(true)).toBe(
      'grid-cols-1 labours-stack:grid-cols-[320px_minmax(0,1fr)]',
    );
  });

  it('keeps one column all the way up when there is no cover', () => {
    expect(selectFeaturedArticleClassName(false)).toBe(
      'grid-cols-1 labours-stack:grid-cols-[minmax(0,1fr)]',
    );
  });
});

describe('selectFilmstripCardBorderClassName', () => {
  it('draws the active card in ink', () => {
    expect(selectFilmstripCardBorderClassName(true)).toBe('border-labours-ink');
  });

  it('leaves an inactive card on the dashed rule until it is hovered', () => {
    expect(selectFilmstripCardBorderClassName(false)).toBe(
      'border-labours-dash-rule hover:border-labours-ink',
    );
  });
});

describe('selectYearButtonColors', () => {
  it('fills the selected year', () => {
    expect(selectYearButtonColors(true)).toEqual({
      background: 'var(--color-labours-ink)',
      color: 'var(--color-labours-paper)',
    });
  });

  it('leaves an unselected year transparent', () => {
    expect(selectYearButtonColors(false)).toEqual({
      background: 'transparent',
      color: 'var(--color-labours-ink)',
    });
  });
});
