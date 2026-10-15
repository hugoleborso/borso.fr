import { describe, expect, it, type Mock, vi } from 'vitest';
import { type FeedFetcher, MAX_REDIRECTS, readCalendarFeed } from './calendar-feed.adapter';

const FEED_ADDRESS = 'https://calendar.example.com/private/feed.ics';
const ICS_BODY = 'BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n';

function respond(status: number, body: string | null = null, headers: Record<string, string> = {}) {
  return new Response(body, { status, headers });
}

function fetcherAnswering(...responses: Response[]): Mock<FeedFetcher> {
  const fetcher = vi.fn<FeedFetcher>();
  for (const response of responses) fetcher.mockResolvedValueOnce(response);
  return fetcher;
}

describe('readCalendarFeed', () => {
  it('returns the body of a feed that answers 200, without following redirects itself', async () => {
    const fetcher = fetcherAnswering(respond(200, ICS_BODY));
    expect(await readCalendarFeed(FEED_ADDRESS, { fetcher })).toStrictEqual({
      kind: 'ok',
      body: ICS_BODY,
    });
    expect(fetcher).toHaveBeenCalledWith(
      FEED_ADDRESS,
      expect.objectContaining({ redirect: 'manual' }),
    );
  });

  it('returns an empty body when the provider sends none', async () => {
    const fetcher = fetcherAnswering(respond(200));
    expect(await readCalendarFeed(FEED_ADDRESS, { fetcher })).toStrictEqual({
      kind: 'ok',
      body: '',
    });
  });

  it.each([401, 403, 404, 410])(
    'asks to reconnect when the provider answers %i',
    async (status) => {
      const fetcher = fetcherAnswering(respond(status));
      expect(await readCalendarFeed(FEED_ADDRESS, { fetcher })).toStrictEqual({
        kind: 'needs-reconnecting',
        status,
      });
    },
  );

  it('reports the feed unavailable on a server error', async () => {
    const fetcher = fetcherAnswering(respond(503));
    expect(await readCalendarFeed(FEED_ADDRESS, { fetcher })).toStrictEqual({
      kind: 'unavailable',
      status: 503,
    });
  });

  it('reports the feed unavailable when the request throws, such as on a timeout', async () => {
    const fetcher = vi.fn<FeedFetcher>().mockRejectedValue(new DOMException('timed out'));
    expect(await readCalendarFeed(FEED_ADDRESS, { fetcher, timeoutMs: 1 })).toStrictEqual({
      kind: 'unavailable',
      status: null,
    });
  });

  it('gives up on a provider that does not answer within the time limit', async () => {
    const fetcher = vi.fn<FeedFetcher>(
      (_address, init) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new DOMException('aborted')));
        }),
    );
    expect(await readCalendarFeed(FEED_ADDRESS, { fetcher, timeoutMs: 20 })).toStrictEqual({
      kind: 'unavailable',
      status: null,
    });
  });

  it('stops reading a body over the size limit', async () => {
    const fetcher = fetcherAnswering(respond(200, 'x'.repeat(64)));
    expect(await readCalendarFeed(FEED_ADDRESS, { fetcher, maxBytes: 16 })).toStrictEqual({
      kind: 'unavailable',
      status: 200,
    });
  });

  it('reads a body exactly at the size limit', async () => {
    const fetcher = fetcherAnswering(respond(200, 'x'.repeat(16)));
    expect(await readCalendarFeed(FEED_ADDRESS, { fetcher, maxBytes: 16 })).toStrictEqual({
      kind: 'ok',
      body: 'x'.repeat(16),
    });
  });

  it('follows a redirect to another public https host, relative or absolute', async () => {
    const fetcher = fetcherAnswering(
      respond(302, null, { location: 'https://cdn.example.net/feed.ics' }),
      respond(301, null, { location: '/moved.ics' }),
      respond(200, ICS_BODY),
    );
    expect(await readCalendarFeed(FEED_ADDRESS, { fetcher })).toStrictEqual({
      kind: 'ok',
      body: ICS_BODY,
    });
    expect(fetcher.mock.calls.map(([address]) => address)).toStrictEqual([
      FEED_ADDRESS,
      'https://cdn.example.net/feed.ics',
      'https://cdn.example.net/moved.ics',
    ]);
  });

  it('refuses a redirect to the Lambda runtime API', async () => {
    const fetcher = fetcherAnswering(
      respond(307, null, { location: 'http://127.0.0.1:9001/2018-06-01/runtime/invocation/next' }),
    );
    expect(await readCalendarFeed(FEED_ADDRESS, { fetcher })).toStrictEqual({
      kind: 'unavailable',
      status: 307,
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('refuses a redirect without a location', async () => {
    const fetcher = fetcherAnswering(respond(308), respond(200, ICS_BODY));
    expect(await readCalendarFeed(FEED_ADDRESS, { fetcher })).toStrictEqual({
      kind: 'unavailable',
      status: 308,
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('decodes a character split across two chunks', async () => {
    const accented = new TextEncoder().encode('SUMMARY:Répétition');
    const splitAt = accented.indexOf(0xc3) + 1;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(accented.slice(0, splitAt));
        controller.enqueue(accented.slice(splitAt));
        controller.close();
      },
    });
    const fetcher = fetcherAnswering(new Response(body, { status: 200 }));
    expect(await readCalendarFeed(FEED_ADDRESS, { fetcher })).toStrictEqual({
      kind: 'ok',
      body: 'SUMMARY:Répétition',
    });
  });

  it('gives up after the redirect limit', async () => {
    const redirects = Array.from({ length: MAX_REDIRECTS + 1 }, () =>
      respond(303, null, { location: '/again.ics' }),
    );
    const fetcher = fetcherAnswering(...redirects, respond(200, ICS_BODY));
    expect(await readCalendarFeed(FEED_ADDRESS, { fetcher })).toStrictEqual({
      kind: 'unavailable',
      status: 303,
    });
    expect(fetcher).toHaveBeenCalledTimes(MAX_REDIRECTS + 1);
  });

  it('asks to reconnect without any request when the stored address fails the guard', async () => {
    const fetcher = fetcherAnswering();
    expect(await readCalendarFeed('http://localhost/feed.ics', { fetcher })).toStrictEqual({
      kind: 'needs-reconnecting',
      status: null,
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('uses the global fetch when no fetcher is given', async () => {
    const globalFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(respond(200, ICS_BODY));
    expect(await readCalendarFeed(FEED_ADDRESS)).toStrictEqual({ kind: 'ok', body: ICS_BODY });
    globalFetch.mockRestore();
  });
});
