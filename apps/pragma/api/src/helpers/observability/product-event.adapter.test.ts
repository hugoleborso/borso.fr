/**
 * @vitest-environment node
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { recordProductEvent } from './product-event.adapter';

afterEach(() => {
  vi.restoreAllMocks();
});

// @FollowsBlueprint test-node-adapter
describe('recordProductEvent', () => {
  it('writes the event as one JSON line, which the log query reads back', () => {
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    recordProductEvent({ event: 'take_created', source: 'live', queued: false });

    expect(write).toHaveBeenCalledExactlyOnceWith(
      '{"event":"take_created","source":"live","queued":false}\n',
    );
  });
});
