import { describe, expect, it } from 'vitest';
import { signGetInputSchema, signUploadInputSchema } from './uploads.schema';
import { MAX_UPLOAD_BYTES } from './uploads.types';

const validSha256 = 'a'.repeat(64);

function signUpload(overrides: Record<string, unknown> = {}): unknown {
  return { contentType: 'application/pdf', contentLength: 1_024, ...overrides };
}

describe('signUploadInputSchema', () => {
  it('accepts a chart with only the two required fields', () => {
    expect(signUploadInputSchema.safeParse(signUpload()).success).toBe(true);
  });

  it('refuses a content type outside the allow-list', () => {
    expect(signUploadInputSchema.safeParse(signUpload({ contentType: 'text/html' })).success).toBe(
      false,
    );
  });

  it('refuses a size above the ceiling and accepts one exactly at it', () => {
    expect(
      signUploadInputSchema.safeParse(signUpload({ contentLength: MAX_UPLOAD_BYTES + 1 })).success,
    ).toBe(false);
    expect(
      signUploadInputSchema.safeParse(signUpload({ contentLength: MAX_UPLOAD_BYTES })).success,
    ).toBe(true);
  });

  it('refuses a size that is not a positive whole number of bytes', () => {
    expect(signUploadInputSchema.safeParse(signUpload({ contentLength: 0 })).success).toBe(false);
    expect(signUploadInputSchema.safeParse(signUpload({ contentLength: -1 })).success).toBe(false);
    expect(signUploadInputSchema.safeParse(signUpload({ contentLength: 12.5 })).success).toBe(
      false,
    );
  });

  it('accepts a checksum only in the shape a sha256 digest takes', () => {
    expect(
      signUploadInputSchema.safeParse(signUpload({ contentSha256: validSha256 })).success,
    ).toBe(true);
    expect(
      signUploadInputSchema.safeParse(signUpload({ contentSha256: validSha256.toUpperCase() }))
        .success,
    ).toBe(false);
    expect(
      signUploadInputSchema.safeParse(signUpload({ contentSha256: 'a'.repeat(63) })).success,
    ).toBe(false);
  });

  it('accepts a song id only as a uuid', () => {
    expect(
      signUploadInputSchema.safeParse(signUpload({ songId: crypto.randomUUID() })).success,
    ).toBe(true);
    expect(signUploadInputSchema.safeParse(signUpload({ songId: 'song-1' })).success).toBe(false);
  });
});

describe('signGetInputSchema', () => {
  it('accepts an opaque key the sign step handed back', () => {
    expect(signGetInputSchema.safeParse({ objectKey: 'charts/song-1.pdf' }).success).toBe(true);
  });

  it('refuses an empty key, which would sign the bucket root', () => {
    expect(signGetInputSchema.safeParse({ objectKey: '' }).success).toBe(false);
  });

  it('refuses a key longer than a key can be', () => {
    expect(signGetInputSchema.safeParse({ objectKey: 'a'.repeat(513) }).success).toBe(false);
    expect(signGetInputSchema.safeParse({ objectKey: 'a'.repeat(512) }).success).toBe(true);
  });
});
