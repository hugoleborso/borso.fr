/**
 * The caller raises the error, so this returns the status rather than a
 * Response: `null` means accepted, a number is what the storage service
 * refused with and what the message will carry.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { sendFileToPresignedUrl } from './object-upload.adapter';

type PlatformFetch = (url: string, init: RequestInit) => Promise<Response>;

const UPLOAD_URL = 'https://bucket.s3.eu-west-3.amazonaws.com/photos/lap-1.jpg?X-Amz-Signature=x';
const CONTENT_TYPE = 'image/jpeg';

function photoFile(): File {
  return new File(['bytes'], 'lap-1.jpg', { type: CONTENT_TYPE });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('sendFileToPresignedUrl', () => {
  it('puts the bytes to the presigned URL under the content type it was signed for', async () => {
    const fetcher = vi.fn<PlatformFetch>(() =>
      Promise.resolve(new Response(null, { status: 200 })),
    );
    vi.stubGlobal('fetch', fetcher);
    const file = photoFile();
    await sendFileToPresignedUrl(UPLOAD_URL, file, CONTENT_TYPE);
    const [url, init] = fetcher.mock.calls[0] ?? [];
    expect(url).toBe(UPLOAD_URL);
    expect(init).toMatchObject({
      method: 'PUT',
      body: file,
      headers: { 'content-type': CONTENT_TYPE },
    });
  });

  it('answers null when the storage service accepted the transfer', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve(new Response(null, { status: 200 })));
    expect(await sendFileToPresignedUrl(UPLOAD_URL, photoFile(), CONTENT_TYPE)).toBeNull();
  });

  it('hands back the refusal status so the caller can name it in its error', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve(new Response(null, { status: 403 })));
    expect(await sendFileToPresignedUrl(UPLOAD_URL, photoFile(), CONTENT_TYPE)).toBe(403);
  });
});
