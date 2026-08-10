import { describe, expect, it } from 'vitest';
import {
  clampSceneFontSize,
  formatSemitoneOffset,
  SCENE_FONT_SIZE_MAX_PX,
  SCENE_FONT_SIZE_MIN_PX,
  selectChordproText,
} from './scene-view.core';

describe('selectChordproText', () => {
  it('returns the text of a ChordPro chart', () => {
    expect(selectChordproText({ kind: 'chordpro', text: '[C]Hello' })).toBe('[C]Hello');
  });

  it('returns null for a chart of another kind', () => {
    expect(selectChordproText({ kind: 'pdf' })).toBeNull();
  });

  it('returns null for a chart of another kind that does carry text', () => {
    expect(selectChordproText({ kind: 'pdf', text: '[C]Hello' })).toBeNull();
  });

  it('returns null when the song carries no chart', () => {
    expect(selectChordproText(null)).toBeNull();
    expect(selectChordproText(undefined)).toBeNull();
  });

  it('returns null for a ChordPro chart with no text', () => {
    expect(selectChordproText({ kind: 'chordpro' })).toBeNull();
  });
});

describe('clampSceneFontSize', () => {
  it('keeps a size inside the readable range', () => {
    expect(clampSceneFontSize(24)).toBe(24);
  });

  it('clamps below the floor', () => {
    expect(clampSceneFontSize(2)).toBe(SCENE_FONT_SIZE_MIN_PX);
  });

  it('clamps above the ceiling', () => {
    expect(clampSceneFontSize(400)).toBe(SCENE_FONT_SIZE_MAX_PX);
  });
});

describe('formatSemitoneOffset', () => {
  it('signs a positive offset', () => {
    expect(formatSemitoneOffset(3)).toBe('+3');
  });

  it('signs zero as positive', () => {
    expect(formatSemitoneOffset(0)).toBe('+0');
  });

  it('leaves a negative offset as written', () => {
    expect(formatSemitoneOffset(-2)).toBe('-2');
  });
});
