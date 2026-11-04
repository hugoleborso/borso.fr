import { describe, expect, it } from 'vitest';
import { INSTRUMENT_GLYPHS } from './InstrumentGlyphs';
import { INTERFACE_GLYPHS } from './InterfaceGlyphs';

const SITE_SOURCES = import.meta.glob<string>(
  [
    '../../**/*.{ts,tsx}',
    '!../../**/*.test.{ts,tsx}',
    '!./InterfaceGlyphs.tsx',
    '!./InstrumentGlyphs.tsx',
  ],
  { query: '?raw', import: 'default', eager: true },
);

const GLYPH_NAMES = [...Object.keys(INTERFACE_GLYPHS), ...Object.keys(INSTRUMENT_GLYPHS)];

function isNamedInSource(glyphName: string): boolean {
  return Object.values(SITE_SOURCES).some(
    (source) => source.includes(`'${glyphName}'`) || source.includes(`"${glyphName}"`),
  );
}

describe('the icon registry', () => {
  it('reads the site sources it searches', () => {
    expect(Object.keys(SITE_SOURCES).length).toBeGreaterThan(100);
  });

  it.each(GLYPH_NAMES)('has a caller for the %s glyph', (glyphName) => {
    expect(isNamedInSource(glyphName)).toBe(true);
  });
});
