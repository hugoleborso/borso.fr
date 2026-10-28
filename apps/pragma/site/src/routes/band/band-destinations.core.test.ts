import { describe, expect, it } from 'vitest';
import { SHELL_TABS } from '../../components/organisms/navigation-active.core';
import { BAND_DESTINATIONS } from './band-destinations.core';

const FORMER_DRAWER_DESTINATIONS = [
  '/members',
  '/instruments',
  '/bars',
  '/compos',
  '/improvements',
  '/studies',
];

// @FollowsBlueprint test-pure-unit
describe('BAND_DESTINATIONS', () => {
  it('gives every tab and every Band link an icon of its own', () => {
    const icons = [...SHELL_TABS, ...BAND_DESTINATIONS].map((destination) => destination.icon);
    expect(new Set(icons).size).toBe(icons.length);
  });

  it('keeps every destination the More drawer and the old tabs held within reach', () => {
    const paths = BAND_DESTINATIONS.map((destination) => destination.to);
    expect(paths).toEqual(expect.arrayContaining(FORMER_DRAWER_DESTINATIONS));
  });

  it('lists the account page last', () => {
    expect(BAND_DESTINATIONS.at(-1)?.to).toBe('/account');
  });
});
