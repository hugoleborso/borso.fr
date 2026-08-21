import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { debounce } from './debounce.utils';

// @FollowsBlueprint test-pure-unit
describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls the underlying function once after the delay elapses', () => {
    const spy = vi.fn();
    const debounced = debounce(spy, 100);
    debounced('a');
    expect(spy).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('a');
  });

  it('coalesces rapid calls into a single trailing invocation', () => {
    const spy = vi.fn();
    const debounced = debounce(spy, 100);
    debounced('a');
    vi.advanceTimersByTime(50);
    debounced('b');
    vi.advanceTimersByTime(50);
    debounced('c');
    vi.advanceTimersByTime(100);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('c');
  });

  it('cancel() prevents a pending invocation', () => {
    const spy = vi.fn();
    const debounced = debounce(spy, 100);
    debounced('a');
    debounced.cancel();
    vi.advanceTimersByTime(100);
    expect(spy).not.toHaveBeenCalled();
  });

  it('cancel() is a no-op when nothing is pending', () => {
    const spy = vi.fn();
    const debounced = debounce(spy, 100);
    expect(() => debounced.cancel()).not.toThrow();
    vi.advanceTimersByTime(100);
    expect(spy).not.toHaveBeenCalled();
  });
});
