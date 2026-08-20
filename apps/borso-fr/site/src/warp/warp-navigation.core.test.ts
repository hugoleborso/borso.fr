import { describe, expect, it } from 'vitest';
import { isModifiedClick, selectNavigationMode, type LinkActivation } from './warp-navigation.core';

const PLAIN_CLICK_ON_INTERNAL_LINK: LinkActivation = {
  destinationHref: 'https://borso.fr/12-travaux/',
  currentHref: 'https://borso.fr/',
  linkTarget: '',
  isDownloadLink: false,
  isModifiedClick: false,
  isReducedMotionPreferred: false,
};

// @FollowsBlueprint test-pure-unit
describe('selectNavigationMode', () => {
  it('warps a plain click on a link to another page of the site', () => {
    expect(selectNavigationMode(PLAIN_CLICK_ON_INTERNAL_LINK)).toBe('warp');
  });

  it('warps a link that names the current document as its target', () => {
    expect(selectNavigationMode({ ...PLAIN_CLICK_ON_INTERNAL_LINK, linkTarget: '_self' })).toBe(
      'warp',
    );
  });

  it('warps a link that only differs by its query', () => {
    expect(
      selectNavigationMode({
        ...PLAIN_CLICK_ON_INTERNAL_LINK,
        destinationHref: 'https://borso.fr/?palette=night',
      }),
    ).toBe('warp');
  });

  it('leaves the reader alone when they asked for less motion', () => {
    expect(
      selectNavigationMode({ ...PLAIN_CLICK_ON_INTERNAL_LINK, isReducedMotionPreferred: true }),
    ).toBe('browser');
  });

  it('leaves a modified click to the browser, which opens it elsewhere', () => {
    expect(selectNavigationMode({ ...PLAIN_CLICK_ON_INTERNAL_LINK, isModifiedClick: true })).toBe(
      'browser',
    );
  });

  it('leaves a download alone, because the page it was clicked from stays', () => {
    expect(selectNavigationMode({ ...PLAIN_CLICK_ON_INTERNAL_LINK, isDownloadLink: true })).toBe(
      'browser',
    );
  });

  it('leaves a link that opens another tab alone', () => {
    expect(selectNavigationMode({ ...PLAIN_CLICK_ON_INTERNAL_LINK, linkTarget: '_blank' })).toBe(
      'browser',
    );
  });

  it('leaves another site alone', () => {
    expect(
      selectNavigationMode({
        ...PLAIN_CLICK_ON_INTERNAL_LINK,
        destinationHref: 'https://example.com/',
      }),
    ).toBe('browser');
  });

  it('leaves a jump to an anchor on the page already open alone', () => {
    expect(
      selectNavigationMode({
        ...PLAIN_CLICK_ON_INTERNAL_LINK,
        destinationHref: 'https://borso.fr/#contact',
      }),
    ).toBe('browser');
  });
});

const PRIMARY_UNMODIFIED_CLICK = {
  button: 0,
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
};

describe('isModifiedClick', () => {
  it('reads a plain left click as unmodified', () => {
    expect(isModifiedClick(PRIMARY_UNMODIFIED_CLICK)).toBe(false);
  });

  it('reads a middle click as modified', () => {
    expect(isModifiedClick({ ...PRIMARY_UNMODIFIED_CLICK, button: 1 })).toBe(true);
  });

  it('reads each of the four modifier keys as modified', () => {
    expect(isModifiedClick({ ...PRIMARY_UNMODIFIED_CLICK, altKey: true })).toBe(true);
    expect(isModifiedClick({ ...PRIMARY_UNMODIFIED_CLICK, ctrlKey: true })).toBe(true);
    expect(isModifiedClick({ ...PRIMARY_UNMODIFIED_CLICK, metaKey: true })).toBe(true);
    expect(isModifiedClick({ ...PRIMARY_UNMODIFIED_CLICK, shiftKey: true })).toBe(true);
  });
});
