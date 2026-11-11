import { afterEach, describe, expect, it, vi } from 'vitest';
import { answerSocketEvent } from './main.websocket';

function captureWrittenLines() {
  return vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
}

function readWrittenEvents(write: ReturnType<typeof captureWrittenLines>): unknown[] {
  return write.mock.calls.map(([line]) => {
    const writtenEvent: unknown = JSON.parse(String(line));
    return writtenEvent;
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('answerSocketEvent', () => {
  it('writes one socket event naming the route and its accepted status', async () => {
    const write = captureWrittenLines();

    const reply = await answerSocketEvent({
      requestContext: { connectionId: 'connection-1', routeKey: '$default' },
    });

    expect(reply).toStrictEqual({ statusCode: 200 });
    expect(readWrittenEvents(write)).toMatchObject([
      {
        'service.name': 'banana-rush-api',
        'event.kind': 'socket',
        'socket.route_key': '$default',
        'socket.status_code': 200,
        outcome: 'success',
      },
    ]);
  });

  it('records a socket event with no connection as refused', async () => {
    const write = captureWrittenLines();

    const reply = await answerSocketEvent({ requestContext: {} });

    expect(reply).toStrictEqual({ statusCode: 400 });
    const [event] = readWrittenEvents(write);
    expect(event).toMatchObject({
      'event.kind': 'socket',
      'socket.status_code': 400,
      outcome: 'refused',
    });
    expect(event).not.toHaveProperty('socket.route_key');
  });
});
