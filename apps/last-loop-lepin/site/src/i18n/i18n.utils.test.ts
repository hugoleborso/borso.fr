import { describe, expect, it } from 'vitest';
import {
  compareCatalogueKeys,
  DEFAULT_LANGUAGE,
  flattenKeys,
  selectInitialLanguage,
} from './i18n.utils';

// @FollowsBlueprint test-pure-unit
describe('flattenKeys', () => {
  it('returns an empty list for an empty catalogue', () => {
    expect(flattenKeys({})).toEqual([]);
  });

  it('returns the leaf keys of a flat catalogue, sorted', () => {
    expect(flattenKeys({ zeta: 'z', alpha: 'a' })).toEqual(['alpha', 'zeta']);
  });

  it('joins nested segments with a dot', () => {
    expect(flattenKeys({ admin: { tab: { setup: 'Setup' } } })).toEqual(['admin.tab.setup']);
  });

  it('keeps a caller supplied prefix in front of every key', () => {
    expect(flattenKeys({ title: 'Title' }, 'spectator')).toEqual(['spectator.title']);
  });
});

describe('selectInitialLanguage', () => {
  it('returns the saved language when it is supported', () => {
    expect(selectInitialLanguage('en', ['fr-FR'])).toBe('en');
  });

  it('ignores a saved language the application does not support', () => {
    expect(selectInitialLanguage('de', ['en-GB'])).toBe('en');
  });

  it('falls back to the first supported browser language family', () => {
    expect(selectInitialLanguage(null, ['de-DE', 'en-US'])).toBe('en');
  });

  it('reads a browser language with no region as its own family, English included, French alone doubling as the default and so unable to tell the family lookup from the fallback', () => {
    expect(selectInitialLanguage(null, ['fr'])).toBe('fr');
    expect(selectInitialLanguage(null, ['en'])).toBe('en');
  });

  it('returns the default language when nothing matches', () => {
    expect(selectInitialLanguage(null, ['de-DE'])).toBe(DEFAULT_LANGUAGE);
  });

  it('returns the default language when the browser lists nothing', () => {
    expect(selectInitialLanguage(null, [])).toBe(DEFAULT_LANGUAGE);
  });
});

describe('compareCatalogueKeys', () => {
  it('orders an earlier key before a later one', () => {
    expect(compareCatalogueKeys('admin', 'nav')).toBe(-1);
  });

  it('orders a later key after an earlier one', () => {
    expect(compareCatalogueKeys('nav', 'admin')).toBe(1);
  });

  it('treats two equal keys as equal', () => {
    expect(compareCatalogueKeys('nav', 'nav')).toBe(0);
  });
});
