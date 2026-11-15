import { describe, expect, it } from 'vitest';
import { type BackLinkClick, selectBackLinkMove } from './back-link.core';

const PLAIN_CLICK: BackLinkClick = {
  button: 0,
  metaKey: false,
  altKey: false,
  ctrlKey: false,
  shiftKey: false,
};

const BAND_ENTRY = 'https://pragma.borso.fr/band';

// @FollowsBlueprint core-decision
describe('selectBackLinkMove', () => {
  it('steps back when the previous entry is the parent page', () => {
    expect(selectBackLinkMove(PLAIN_CLICK, BAND_ENTRY, '/band')).toBe('step-back');
  });

  it('steps back to the parent whatever query the parent page wrote', () => {
    expect(
      selectBackLinkMove(PLAIN_CLICK, 'https://pragma.borso.fr/sessions?view=past', '/sessions'),
    ).toBe('step-back');
  });

  it('compares the parent path without its own query', () => {
    expect(selectBackLinkMove(PLAIN_CLICK, BAND_ENTRY, '/band?filter=open')).toBe('step-back');
  });

  it('follows the link when the previous entry is another page', () => {
    expect(selectBackLinkMove(PLAIN_CLICK, 'https://pragma.borso.fr/catalog', '/band')).toBe(
      'follow-link',
    );
  });

  it('follows the link when the previous entry is a deeper page under the parent', () => {
    expect(
      selectBackLinkMove(PLAIN_CLICK, 'https://pragma.borso.fr/setlists/7/order', '/setlists/7'),
    ).toBe('follow-link');
  });

  it('follows the link when there is no previous entry', () => {
    expect(selectBackLinkMove(PLAIN_CLICK, null, '/band')).toBe('follow-link');
  });

  it.each([
    ['a middle click', { button: 1 }],
    ['a command click', { metaKey: true }],
    ['an option click', { altKey: true }],
    ['a control click', { ctrlKey: true }],
    ['a shift click', { shiftKey: true }],
  ])('leaves %s to the browser even when the parent is the previous entry', (_name, override) => {
    expect(selectBackLinkMove({ ...PLAIN_CLICK, ...override }, BAND_ENTRY, '/band')).toBe(
      'follow-link',
    );
  });
});
