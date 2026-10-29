import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { connectCdpSession } from './cdp-session.adapter';

type Listener = (event: { data?: unknown }) => void;

class FakeSocket {
  static latest: FakeSocket | null = null;
  readonly sent: string[] = [];
  readonly listeners = new Map<string, Listener>();
  isClosed = false;

  constructor(readonly url: string) {
    FakeSocket.latest = this;
    queueMicrotask(() => {
      this.listeners.get(url.includes('broken') ? 'error' : 'open')?.({});
    });
  }

  addEventListener(type: string, listener: Listener): void {
    this.listeners.set(type, listener);
  }

  send(payload: string): void {
    this.sent.push(payload);
  }

  reply(payload: unknown): void {
    this.listeners.get('message')?.({ data: JSON.stringify(payload) });
  }

  close(): void {
    this.isClosed = true;
  }
}

function answerTargets(targets: unknown): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ json: async () => targets })),
  );
}

describe('connectCdpSession', () => {
  beforeEach(() => {
    vi.stubGlobal('WebSocket', FakeSocket);
    answerTargets([
      { type: 'service_worker', webSocketDebuggerUrl: 'ws://worker' },
      { type: 'page', webSocketDebuggerUrl: 'ws://page' },
    ]);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('opens the first page target and answers each call by its id', async () => {
    const session = await connectCdpSession(9282);
    const socket = FakeSocket.latest;
    expect(socket?.url).toBe('ws://page');
    expect(fetch).toHaveBeenCalledWith('http://127.0.0.1:9282/json/list');
    const answer = session.send('Page.enable');
    socket?.reply({ method: 'Page.loadEventFired' });
    socket?.reply({ id: 99, result: {} });
    socket?.reply({ id: 1, result: { ok: true } });
    await expect(answer).resolves.toEqual({ ok: true });
    expect(JSON.parse(socket?.sent[0] ?? '{}')).toEqual({
      id: 1,
      method: 'Page.enable',
      params: {},
    });
    session.close();
    expect(socket?.isClosed).toBe(true);
  });

  it('hands each event to the handlers listening for its method until they stop', async () => {
    const session = await connectCdpSession(9282);
    const received: unknown[] = [];
    const stop = session.listen('Fetch.requestPaused', (parameters) => {
      received.push(parameters);
    });
    FakeSocket.latest?.reply({ method: 'Fetch.requestPaused', params: { requestId: 'a' } });
    FakeSocket.latest?.reply({ method: 'Page.loadEventFired', params: {} });
    FakeSocket.latest?.reply({ params: {} });
    stop();
    FakeSocket.latest?.reply({ method: 'Fetch.requestPaused', params: { requestId: 'b' } });
    expect(received).toEqual([{ requestId: 'a' }]);
  });

  it('hands an event that names no method to the handlers of the empty method only', async () => {
    const session = await connectCdpSession(9282);
    const received: unknown[] = [];
    session.listen('', (parameters) => {
      received.push(parameters);
    });
    FakeSocket.latest?.reply({ params: { anonymous: true } });
    expect(received).toEqual([{ anonymous: true }]);
  });

  it('rejects a call the browser refused', async () => {
    const session = await connectCdpSession(9282);
    const answer = session.send('Page.navigate', { url: 'x' });
    FakeSocket.latest?.reply({ id: 1, error: { message: 'no' } });
    await expect(answer).rejects.toThrow('{"message":"no"}');
  });

  it('evaluates a function with its argument and returns the value', async () => {
    const session = await connectCdpSession(9282);
    const value = session.evaluate('(name) => name', 'Léa');
    FakeSocket.latest?.reply({ id: 1, result: { result: { value: 'Léa' } } });
    await expect(value).resolves.toBe('Léa');
    const sent: unknown = JSON.parse(FakeSocket.latest?.sent[0] ?? '{}');
    expect(sent).toEqual({
      id: 1,
      method: 'Runtime.evaluate',
      params: { expression: '((name) => name)("Léa")', returnByValue: true, awaitPromise: true },
    });
    const empty = session.evaluate('() => 1');
    FakeSocket.latest?.reply({ id: 2, result: {} });
    await expect(empty).resolves.toBeUndefined();
  });

  it('throws the page exception, its text, or a fixed message', async () => {
    const session = await connectCdpSession(9282);
    const described = session.evaluate('() => boom()');
    FakeSocket.latest?.reply({
      id: 1,
      result: { exceptionDetails: { exception: { description: 'ReferenceError: boom' } } },
    });
    await expect(described).rejects.toThrow('ReferenceError: boom');
    const texted = session.evaluate('() => boom()');
    FakeSocket.latest?.reply({ id: 2, result: { exceptionDetails: { text: 'Uncaught' } } });
    await expect(texted).rejects.toThrow('Uncaught');
    const bare = session.evaluate('() => boom()');
    FakeSocket.latest?.reply({ id: 3, result: { exceptionDetails: {} } });
    await expect(bare).rejects.toThrow('evaluation failed');
  });

  it('fails without a page target and when the socket cannot open', async () => {
    answerTargets([{ type: 'service_worker', webSocketDebuggerUrl: 'ws://worker' }]);
    await expect(connectCdpSession(9282)).rejects.toThrow('no page target on DevTools port 9282');
    answerTargets([{ type: 'page' }]);
    await expect(connectCdpSession(9282)).rejects.toThrow('no page target on DevTools port 9282');
    answerTargets([{ type: 'page', webSocketDebuggerUrl: 'ws://broken' }]);
    await expect(connectCdpSession(9282)).rejects.toThrow('could not open ws://broken');
  });
});
