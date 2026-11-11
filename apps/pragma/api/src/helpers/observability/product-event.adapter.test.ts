/**
 * @vitest-environment node
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { recordProductEvent } from './product-event.adapter';
import { runInWideEvent } from './wide-event.adapter';

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

  it('also names the event in the product events of the open request', async () => {
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    await runInWideEvent({ 'request.id': 'request-1' }, () => {
      recordProductEvent({ event: 'take_created' });
      recordProductEvent({ event: 'push_sent' });
      return Promise.resolve();
    });

    const requestEvent: unknown = JSON.parse(String(write.mock.calls.at(-1)?.[0]));
    expect(requestEvent).toMatchObject({
      'request.id': 'request-1',
      'product.events': ['take_created', 'push_sent'],
    });
  });
});
