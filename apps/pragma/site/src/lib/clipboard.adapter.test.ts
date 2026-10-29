import { afterEach, describe, expect, it, vi } from 'vitest';
import { didCopyTextToClipboard, readTextFromClipboard } from './clipboard.adapter';

function stubClipboard(writeText: () => Promise<void>): void {
  vi.stubGlobal('navigator', { clipboard: { writeText } });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('didCopyTextToClipboard', () => {
  it('writes the text and reports the write happened', async () => {
    const writeText = vi.fn(async () => undefined);
    stubClipboard(writeText);

    await expect(didCopyTextToClipboard('hello')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('hello');
  });

  it('reports a refused clipboard rather than throwing', async () => {
    stubClipboard(async () => {
      throw new Error('denied');
    });

    await expect(didCopyTextToClipboard('hello')).resolves.toBe(false);
  });
});

describe('readTextFromClipboard', () => {
  it('answers the text on the clipboard', async () => {
    vi.stubGlobal('navigator', { clipboard: { readText: async () => 'Am\nla' } });

    await expect(readTextFromClipboard()).resolves.toBe('Am\nla');
  });

  it('answers null when the browser refuses the read', async () => {
    vi.stubGlobal('navigator', {
      clipboard: {
        readText: async () => {
          throw new Error('denied');
        },
      },
    });

    await expect(readTextFromClipboard()).resolves.toBeNull();
  });
});
