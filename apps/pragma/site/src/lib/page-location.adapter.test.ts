import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  type HistoryEntriesHost,
  leavePageFor,
  readPageOrigin,
  readPreviousEntryUrl,
} from './page-location.adapter';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('page-location.adapter', () => {
  it('reads the origin the page was served from', () => {
    vi.stubGlobal('location', { origin: 'https://pragma.borso.fr' });
    expect(readPageOrigin()).toBe('https://pragma.borso.fr');
  });

  it('hands the address to the browser rather than to the router', () => {
    const assign = vi.fn();
    vi.stubGlobal('location', { assign });
    leavePageFor('http://127.0.0.1:4000/callback?code=abc');
    expect(assign).toHaveBeenCalledWith('http://127.0.0.1:4000/callback?code=abc');
  });
});

function hostAt(urls: readonly (string | null)[], currentIndex: number | null): HistoryEntriesHost {
  return {
    navigation: {
      currentEntry: currentIndex === null ? null : { index: currentIndex },
      entries: () => urls.map((url) => ({ url })),
    },
  };
}

describe('readPreviousEntryUrl', () => {
  it('answers the address of the entry before the current one', () => {
    const host = hostAt(['https://pragma.borso.fr/band', 'https://pragma.borso.fr/members'], 1);
    expect(readPreviousEntryUrl(host)).toBe('https://pragma.borso.fr/band');
  });

  it('answers null on the first entry of the tab', () => {
    expect(readPreviousEntryUrl(hostAt(['https://pragma.borso.fr/members'], 0))).toBeNull();
  });

  it('answers null when the browser hides the previous address', () => {
    expect(readPreviousEntryUrl(hostAt([null, 'https://pragma.borso.fr/members'], 1))).toBeNull();
  });

  it('answers null when the current entry is unknown', () => {
    expect(readPreviousEntryUrl(hostAt(['https://pragma.borso.fr/band'], null))).toBeNull();
  });

  it('answers null when the browser has no navigation history to read', () => {
    expect(readPreviousEntryUrl({})).toBeNull();
  });

  it('reads the page window when no host is given', () => {
    expect(readPreviousEntryUrl()).toBeNull();
  });
});
