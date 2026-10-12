import { describe, expect, it } from 'vitest';
import {
  buildFocusPayload,
  canAddFocusItem,
  focusFormSchema,
  isHorizonPast,
  toFocusFormValues,
} from './focus-editor.core';

describe('toFocusFormValues', () => {
  it('fills the missing why and horizon with empty strings', () => {
    expect(toFocusFormValues([{ title: 'Séville', horizon: '2026-10-15' }])).toEqual({
      items: [{ title: 'Séville', why: '', horizon: '2026-10-15' }],
    });
  });

  it('fills a missing horizon with an empty string', () => {
    expect(toFocusFormValues([{ title: 'CV', why: 'rare' }]).items[0]?.horizon).toBe('');
  });

  it('keeps a why that is present', () => {
    expect(toFocusFormValues([{ title: 'CV', why: 'rare' }]).items[0]?.why).toBe('rare');
  });

  it('keeps at most three items', () => {
    const four = ['a', 'b', 'c', 'd'].map((title) => ({ title }));
    expect(toFocusFormValues(four).items).toHaveLength(3);
  });
});

describe('buildFocusPayload', () => {
  it('trims every field and omits the empty optional ones', () => {
    expect(
      buildFocusPayload({
        items: [
          { title: ' Appel Acme ', why: ' fenêtre rare ', horizon: '2026-10-05' },
          { title: 'Séville', why: '  ', horizon: '' },
        ],
      }),
    ).toEqual({
      items: [
        { title: 'Appel Acme', why: 'fenêtre rare', horizon: '2026-10-05' },
        { title: 'Séville' },
      ],
    });
  });

  it('drops an item whose title is blank', () => {
    expect(buildFocusPayload({ items: [{ title: '  ', why: 'x', horizon: '' }] })).toEqual({
      items: [],
    });
  });

  it('never sends more than three items', () => {
    const fourDrafts = ['a', 'b', 'c', 'd'].map((title) => ({ title, why: '', horizon: '' }));
    expect(buildFocusPayload({ items: fourDrafts }).items).toHaveLength(3);
  });
});

describe('focusFormSchema', () => {
  it('accepts three items and refuses four', () => {
    const draft = { title: 'a', why: '', horizon: '' };
    expect(focusFormSchema.safeParse({ items: [draft, draft, draft] }).success).toBe(true);
    expect(focusFormSchema.safeParse({ items: [draft, draft, draft, draft] }).success).toBe(false);
  });
});

describe('canAddFocusItem', () => {
  it('allows a third item and refuses a fourth', () => {
    expect(canAddFocusItem(2)).toBe(true);
    expect(canAddFocusItem(3)).toBe(false);
  });
});

describe('isHorizonPast', () => {
  it('flags a horizon before today only', () => {
    expect(isHorizonPast('2026-10-04', '2026-10-05')).toBe(true);
    expect(isHorizonPast('2026-10-05', '2026-10-05')).toBe(false);
  });
});
