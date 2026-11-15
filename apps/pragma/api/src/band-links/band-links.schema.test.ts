import { randomUUID } from 'node:crypto';
import { BAND_LINK_LABEL_MAX_LENGTH, BAND_LINK_URL_MAX_LENGTH } from '@domain/input-limits.core';
import { describe, expect, it } from 'vitest';
import { bandLinkCreateSchema, bandLinkPathSchema } from './band-links.schema';

const FOLDER_ADDRESS = 'https://drive.example.com/drive/folders/photos';
const HTTPS_PREFIX = 'https://drive.example.com/';

// @FollowsBlueprint test-pure-unit
describe('the band link input', () => {
  it('trims the label and the address', () => {
    const bandLink = bandLinkCreateSchema.parse({
      id: randomUUID(),
      label: '  Photos ',
      url: ` ${FOLDER_ADDRESS} `,
    });
    expect(bandLink.label).toBe('Photos');
    expect(bandLink.url).toBe(FOLDER_ADDRESS);
  });

  it('refuses an http address, a blank label, an overlong label or address and an unknown field', () => {
    const id = randomUUID();
    const refused = [
      { id, label: 'Photos', url: 'http://drive.example.com/drive/folders/photos' },
      { id, label: '   ', url: FOLDER_ADDRESS },
      { id, label: 'a'.repeat(BAND_LINK_LABEL_MAX_LENGTH + 1), url: FOLDER_ADDRESS },
      {
        id,
        label: 'Photos',
        url: `${HTTPS_PREFIX}${'a'.repeat(BAND_LINK_URL_MAX_LENGTH - HTTPS_PREFIX.length + 1)}`,
      },
      { id, label: 'Photos', url: FOLDER_ADDRESS, createdAt: '2026-11-15' },
    ];
    expect(refused.map((body) => bandLinkCreateSchema.safeParse(body).success)).toStrictEqual(
      refused.map(() => false),
    );
  });

  it('accepts a label and an address at their longest', () => {
    const longestAddress = `${HTTPS_PREFIX}${'a'.repeat(BAND_LINK_URL_MAX_LENGTH - HTTPS_PREFIX.length)}`;
    const longestLink = {
      id: randomUUID(),
      label: 'a'.repeat(BAND_LINK_LABEL_MAX_LENGTH),
      url: longestAddress,
    };
    expect(bandLinkCreateSchema.safeParse(longestLink).success).toBe(true);
  });

  it('reads the id of the band link a path names', () => {
    expect(bandLinkPathSchema.safeParse({ id: 'photos' }).success).toBe(false);
  });
});
