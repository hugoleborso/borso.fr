/**
 * Pure-unit coverage for the uploads core helpers — extension mapping
 * and object-key composition.
 */

import { describe, expect, it } from 'vitest';
import { buildChartObjectKey, extensionForContentType } from './uploads.core';

// @FollowsBlueprint test-pure-unit
describe('extensionForContentType', () => {
  it('maps every allowed content type to an extension', () => {
    expect(extensionForContentType('application/pdf')).toBe('pdf');
    expect(extensionForContentType('image/png')).toBe('png');
    expect(extensionForContentType('image/jpeg')).toBe('jpg');
    expect(extensionForContentType('image/webp')).toBe('webp');
    expect(extensionForContentType('image/heic')).toBe('heic');
  });
});

describe('buildChartObjectKey', () => {
  it('assembles the prefix/song/random.ext shape', () => {
    expect(
      buildChartObjectKey({
        contentType: 'application/pdf',
        songId: '11111111-1111-1111-1111-111111111111',
        randomId: '22222222-2222-2222-2222-222222222222',
      }),
    ).toBe('chart/11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222222.pdf');
  });

  it('uses the image extension for jpeg uploads', () => {
    expect(
      buildChartObjectKey({
        contentType: 'image/jpeg',
        songId: 'song-1',
        randomId: 'rnd-1',
      }),
    ).toBe('chart/song-1/rnd-1.jpg');
  });
});
