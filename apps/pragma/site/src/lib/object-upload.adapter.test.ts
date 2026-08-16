/**
 * The caller holds a named result rather than a Response, so the two things
 * worth pinning are that the bytes go out as a PUT carrying the file's own
 * content type, and that a refusal reads as `false` rather than as a throw.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { hasSentFileToPresignedUrl } from './object-upload.adapter';

type PlatformFetch = (url: string, init: RequestInit) => Promise<Response>;

const UPLOAD_URL = 'https://bucket.s3.eu-west-3.amazonaws.com/charts/song-1.pdf?X-Amz-Signature=x';

function chartFile(): File {
  return new File(['%PDF-1.7'], 'song-1.pdf', { type: 'application/pdf' });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('hasSentFileToPresignedUrl', () => {
  it('puts the bytes to the presigned URL under the file own content type', async () => {
    const fetcher = vi.fn<PlatformFetch>(() =>
      Promise.resolve(new Response(null, { status: 200 })),
    );
    vi.stubGlobal('fetch', fetcher);
    const file = chartFile();
    await hasSentFileToPresignedUrl(UPLOAD_URL, file);
    const [url, init] = fetcher.mock.calls[0] ?? [];
    expect(url).toBe(UPLOAD_URL);
    expect(init).toMatchObject({
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': 'application/pdf' },
    });
  });

  it('answers true when the storage service accepted the transfer', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve(new Response(null, { status: 200 })));
    expect(await hasSentFileToPresignedUrl(UPLOAD_URL, chartFile())).toBe(true);
  });

  it('answers false when the signature has expired rather than throwing', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve(new Response(null, { status: 403 })));
    expect(await hasSentFileToPresignedUrl(UPLOAD_URL, chartFile())).toBe(false);
  });
});
