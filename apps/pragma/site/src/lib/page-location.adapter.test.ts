import { afterEach, describe, expect, it, vi } from 'vitest';
import { leavePageFor, readPageOrigin } from './page-location.adapter';

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
