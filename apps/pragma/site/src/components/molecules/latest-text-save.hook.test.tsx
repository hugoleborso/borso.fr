import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TEXT_SAVE_PAUSE_MS, useLatestTextSave } from './latest-text-save.hook';

const FULL_TEXT = 'Finir sur le refrain';
const RACE_RUNS = 8;
const KEY_GAPS_MS = [80, 700, 120, 40, 900, 60];
const REPLY_DELAYS_MS = [1500, 50, 900, 300, 2000, 10, 650, 1200];

interface FakeServer {
  readonly requests: string[];
  stored: string;
  readonly save: (text: string) => Promise<unknown>;
}

function buildFakeServer(replyDelayFor: (requestNumber: number) => number): FakeServer {
  const server: FakeServer = {
    requests: [],
    stored: '',
    save: (text) => {
      server.requests.push(text);
      const delay = replyDelayFor(server.requests.length);
      return new Promise((resolve) => {
        setTimeout(() => {
          server.stored = text;
          resolve({ entry: { notes: text } });
        }, delay);
      });
    },
  };
  return server;
}

describe('useLatestTextSave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sends one save after the pause, with the text typed so far', async () => {
    const save = vi.fn(async () => ({}));
    const { result } = renderHook(() => useLatestTextSave({ savedText: '', save }));
    act(() => {
      result.current.type('F');
      result.current.type('Fi');
    });
    expect(save).not.toHaveBeenCalled();
    expect(result.current.status).toBe('unsaved');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(TEXT_SAVE_PAUSE_MS);
    });
    expect(save).toHaveBeenCalledExactlyOnceWith('Fi');
    expect(result.current.status).toBe('saved');
  });

  it.each(Array.from({ length: RACE_RUNS }, (_unused, run) => run))(
    'stores the full text whatever order the replies come back in (run %i)',
    async (run) => {
      const server = buildFakeServer(
        (requestNumber) => REPLY_DELAYS_MS[(run + requestNumber) % REPLY_DELAYS_MS.length] ?? 0,
      );
      const { result } = renderHook(() => useLatestTextSave({ savedText: '', save: server.save }));
      for (let index = 0; index < FULL_TEXT.length; index += 1) {
        act(() => {
          result.current.type(FULL_TEXT.slice(0, index + 1));
        });
        await act(async () => {
          await vi.advanceTimersByTimeAsync(KEY_GAPS_MS[(run + index) % KEY_GAPS_MS.length] ?? 0);
        });
      }
      await act(async () => {
        await vi.runAllTimersAsync();
      });
      expect(server.requests.at(-1)).toBe(FULL_TEXT);
      expect(server.stored).toBe(FULL_TEXT);
      expect(result.current.status).toBe('saved');
    },
  );

  it('sends the pending text at once when flushed, before the pause ends', async () => {
    const save = vi.fn(async () => ({}));
    const { result } = renderHook(() => useLatestTextSave({ savedText: '', save }));
    act(() => {
      result.current.type(FULL_TEXT);
      result.current.flush();
    });
    expect(save).toHaveBeenCalledExactlyOnceWith(FULL_TEXT);
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('sends nothing when flushed with nothing new', () => {
    const save = vi.fn(async () => ({}));
    const { result } = renderHook(() => useLatestTextSave({ savedText: 'same', save }));
    act(() => {
      result.current.flush();
    });
    expect(save).not.toHaveBeenCalled();
  });

  it('keeps the text and reports a failure, then retries on the next key press', async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue({});
    const { result } = renderHook(() => useLatestTextSave({ savedText: '', save, pauseMs: 10 }));
    act(() => {
      result.current.type('Fi');
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(result.current.status).toBe('failed');
    act(() => {
      result.current.type('Fin');
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(save).toHaveBeenLastCalledWith('Fin');
    expect(result.current.status).toBe('saved');
  });
});
