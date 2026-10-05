/**
 * @vitest-environment node
 */

import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { buildTodoId, digestSha1Hex } from './todo-id.core';

const LONGEST_SAMPLE_LENGTH = 300;

function referenceDigest(text: string): string {
  return createHash('sha1').update(text, 'utf8').digest('hex');
}

function sampleOfLength(length: number): string {
  return Array.from({ length }, (_, index) => String.fromCodePoint(97 + ((index * 7) % 26))).join(
    '',
  );
}

describe('digestSha1Hex', () => {
  it('digests the empty string to the published vector', () => {
    expect(digestSha1Hex('')).toBe('da39a3ee5e6b4b0d3255bfef95601890afd80709');
  });

  it('digests "abc" to the published vector', () => {
    expect(digestSha1Hex('abc')).toBe('a9993e364706816aba3e25717850c26c9cd0d89d');
  });

  it('digests the two-block published vector', () => {
    expect(digestSha1Hex('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')).toBe(
      '84983e441c3bd26ebaae4aa1f95129e5e54670f1',
    );
  });

  it('encodes accented text as utf-8 before digesting', () => {
    expect(digestSha1Hex('Payer le loyer | échéance')).toBe(
      referenceDigest('Payer le loyer | échéance'),
    );
  });

  it('agrees with the node implementation on every length across several block boundaries', () => {
    const lengths = Array.from({ length: LONGEST_SAMPLE_LENGTH }, (_, index) => index);
    const mismatches = lengths.filter(
      (length) => digestSha1Hex(sampleOfLength(length)) !== referenceDigest(sampleOfLength(length)),
    );
    expect(mismatches).toEqual([]);
  });
});

describe('buildTodoId', () => {
  it('keeps the first ten hexadecimal characters of sha1(text|added)', () => {
    expect(buildTodoId('Payer le loyer du garage du centre', '2026-10-04')).toBe(
      referenceDigest('Payer le loyer du garage du centre|2026-10-04').slice(0, 10),
    );
  });

  it('hashes an empty added date when the line carries none', () => {
    expect(buildTodoId('Sans date', undefined)).toBe(referenceDigest('Sans date|').slice(0, 10));
  });
});
