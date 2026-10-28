import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTimedOffer } from './timed-offer.hook';

const OFFER_MS = 6_000;

describe('useTimedOffer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('holds the offer for its duration, then drops it', () => {
    const { result } = renderHook(() => useTimedOffer<string>(OFFER_MS));
    act(() => {
      result.current.present('first');
    });
    act(() => {
      vi.advanceTimersByTime(OFFER_MS - 1);
    });
    expect(result.current.offered).toBe('first');
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.offered).toBeNull();
  });

  it('restarts the window when a new offer replaces the old one', () => {
    const { result } = renderHook(() => useTimedOffer<string>(OFFER_MS));
    act(() => {
      result.current.present('first');
    });
    act(() => {
      vi.advanceTimersByTime(OFFER_MS - 1);
    });
    act(() => {
      result.current.present('second');
    });
    act(() => {
      vi.advanceTimersByTime(OFFER_MS - 1);
    });
    expect(result.current.offered).toBe('second');
  });

  it('drops the offer at once when withdrawn, and no timer brings it back', () => {
    const { result } = renderHook(() => useTimedOffer<string>(OFFER_MS));
    act(() => {
      result.current.present('first');
    });
    act(() => {
      result.current.withdraw();
    });
    expect(result.current.offered).toBeNull();
    act(() => {
      vi.advanceTimersByTime(OFFER_MS);
    });
    expect(result.current.offered).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });
});
