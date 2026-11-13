import { describe, expect, it, vi } from 'vitest';
import { followLinkOnAttach } from './departure.adapter';

describe('followLinkOnAttach', () => {
  it('leaves for the link as soon as React attaches it, without keeping this page in the history', () => {
    const replace = vi.fn();
    followLinkOnAttach({
      href: 'https://claude.ai/code/new?repo=a%2Fb',
      ownerDocument: { location: { replace } },
    });
    expect(replace).toHaveBeenCalledExactlyOnceWith('https://claude.ai/code/new?repo=a%2Fb');
  });

  it('does nothing when React detaches the link', () => {
    expect(() => followLinkOnAttach(null)).not.toThrow();
  });
});
