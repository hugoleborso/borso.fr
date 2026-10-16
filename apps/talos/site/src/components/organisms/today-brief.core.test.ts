import { describe, expect, it } from 'vitest';
import { selectBriefPreview } from './today-brief.core';

describe('selectBriefPreview', () => {
  it('keeps the first lines that carry text and says the brief goes on', () => {
    expect(selectBriefPreview('- Un\n\n- Deux\n   \n- Trois\n- Quatre', 3)).toEqual({
      markdown: '- Un\n- Deux\n- Trois',
      isShortened: true,
    });
  });

  it('shows a short brief whole', () => {
    expect(selectBriefPreview('Journée calme\n', 3)).toEqual({
      markdown: 'Journée calme',
      isShortened: false,
    });
  });

  it('counts a brief of exactly the preview length as whole', () => {
    expect(selectBriefPreview('a\nb\nc', 3).isShortened).toBe(false);
  });
});
