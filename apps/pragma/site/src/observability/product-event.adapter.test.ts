import { afterEach, describe, expect, it, vi } from 'vitest';
import { recordProductEvent } from './product-event.adapter';

const sentry = vi.hoisted(() => ({ metrics: { count: vi.fn() } }));

vi.mock('@sentry/react', () => sentry);

describe('recordProductEvent', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('counts one occurrence of the event with its attributes', () => {
    recordProductEvent('setlist_view_changed', { view: 'lineup' });

    expect(sentry.metrics.count).toHaveBeenCalledExactlyOnceWith('setlist_view_changed', 1, {
      attributes: { view: 'lineup' },
    });
  });

  it('counts an event that carries no attribute', () => {
    recordProductEvent('transition_comment_saved');

    expect(sentry.metrics.count).toHaveBeenCalledExactlyOnceWith('transition_comment_saved', 1, {
      attributes: {},
    });
  });
});
