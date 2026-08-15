/**
 * The presign body names an edition, a runner and a photo format, and the
 * format allow-list is the one the adapter signs against.
 */

import { describe, expect, it } from 'vitest';
import { presignInputSchema } from './media.schema';

function presign(overrides: Record<string, unknown> = {}): unknown {
  return {
    editionSlug: 'lepin-2026',
    runnerSlug: 'alice',
    contentType: 'image/jpeg',
    ...overrides,
  };
}

describe('presignInputSchema', () => {
  it('accepts a well-formed request', () => {
    expect(presignInputSchema.safeParse(presign()).success).toBe(true);
  });

  it('accepts every photo format the adapter signs, and no other', () => {
    for (const contentType of ['image/jpeg', 'image/png', 'image/webp']) {
      expect(presignInputSchema.safeParse(presign({ contentType })).success).toBe(true);
    }
    expect(presignInputSchema.safeParse(presign({ contentType: 'image/heif' })).success).toBe(
      false,
    );
  });

  it('refuses a slug shorter than a slug', () => {
    expect(presignInputSchema.safeParse(presign({ editionSlug: 'ab' })).success).toBe(false);
    expect(presignInputSchema.safeParse(presign({ runnerSlug: 'a' })).success).toBe(false);
  });

  it('refuses a slug past the ceiling', () => {
    expect(presignInputSchema.safeParse(presign({ runnerSlug: 'a'.repeat(65) })).success).toBe(
      false,
    );
  });
});
