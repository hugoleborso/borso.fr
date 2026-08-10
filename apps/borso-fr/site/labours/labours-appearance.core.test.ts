import { describe, expect, it } from 'vitest';
import {
  selectFeaturedArticleClassName,
  selectFilmstripBarColor,
  selectFilmstripCardClassName,
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
    expect(colors.background).toBe('#e85a25');
    expect(colors.borderColor).toBe('#e85a25');
    expect(colors.foreground).toBe('#f4ede1');
  });

  it('draws every other status as an outline in its own ink', () => {
    const colors = selectStatusTagColors('failed');
    expect(colors.background).toBe('transparent');
    expect(colors.borderColor).toBe(colors.foreground);
  });

  it.each(EVERY_STATUS)('gives "%s" a foreground colour', (status) => {
    expect(selectStatusTagColors(status).foreground).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe('selectFilmstripBarColor', () => {
  it('keeps the same colour whether or not the card is active, for a settled status', () => {
    expect(selectFilmstripBarColor('done', true)).toBe(selectFilmstripBarColor('done', false));
  });

  it('darkens an abandoned bar on the active card', () => {
    expect(selectFilmstripBarColor('abandoned', true)).toBe('#5a5852');
    expect(selectFilmstripBarColor('abandoned', false)).toBe('#bcb3a0');
  });

  it('darkens an upcoming bar on the active card', () => {
    expect(selectFilmstripBarColor('todo', true)).toBe('#3a3530');
    expect(selectFilmstripBarColor('todo', false)).toBe('#d6cdb8');
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
    expect(active.background).toBe('#171410');
    expect(inactive.background).toBe('transparent');
    expect(active.secondaryOpacity).toBeGreaterThan(inactive.secondaryOpacity);
  });
});

describe('selectFeaturedArticleClassName', () => {
  it('keeps the two column layout when there is a cover', () => {
    expect(selectFeaturedArticleClassName(true)).toBe('twelve-travaux-featured');
  });

  it('collapses to one column when there is no cover', () => {
    expect(selectFeaturedArticleClassName(false)).toContain('--no-cover');
  });
});

describe('selectFilmstripCardClassName', () => {
  it('marks the active card', () => {
    expect(selectFilmstripCardClassName(true)).toContain('is-active');
  });

  it('leaves an inactive card unmarked', () => {
    expect(selectFilmstripCardClassName(false)).toBe('twelve-travaux-filmstrip-card');
  });
});

describe('selectYearButtonColors', () => {
  it('fills the selected year', () => {
    expect(selectYearButtonColors(true)).toEqual({ background: '#171410', color: '#f4ede1' });
  });

  it('leaves an unselected year transparent', () => {
    expect(selectYearButtonColors(false)).toEqual({ background: 'transparent', color: '#171410' });
  });
});
