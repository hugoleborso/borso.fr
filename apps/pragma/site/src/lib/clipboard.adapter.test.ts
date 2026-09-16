import { afterEach, describe, expect, it, vi } from 'vitest';
import { didCopyTextToClipboard } from './clipboard.adapter';

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
