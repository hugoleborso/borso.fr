import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BONUS_KINDS } from '@domain/scoring.core';
import { describe, expect, it } from 'vitest';
import {
  BONUS_CARD_IMAGES,
  HARRY_CARD_IMAGE,
  KRAKEN_CARD_IMAGE,
  RASCAL_CARD_IMAGE,
  WHITE_WHALE_CARD_IMAGE,
} from './card-faces.core';

const PUBLIC_FOLDER = resolve(dirname(fileURLToPath(import.meta.url)), '../../public');

// @FollowsBlueprint test-exhaustive-domain
describe('the card images', () => {
  it('name one distinct image per bonus card and one each for the Kraken, the White Whale, Harry and the Rascal', () => {
    const sources = [
      ...BONUS_KINDS.map((kind) => BONUS_CARD_IMAGES[kind]),
      KRAKEN_CARD_IMAGE,
      WHITE_WHALE_CARD_IMAGE,
      HARRY_CARD_IMAGE,
      RASCAL_CARD_IMAGE,
    ];
    expect(new Set(sources).size).toBe(BONUS_KINDS.length + 4);
  });

  it('name images the site ships', () => {
    for (const source of [
      ...Object.values(BONUS_CARD_IMAGES),
      KRAKEN_CARD_IMAGE,
      WHITE_WHALE_CARD_IMAGE,
      HARRY_CARD_IMAGE,
      RASCAL_CARD_IMAGE,
    ]) {
      expect(existsSync(`${PUBLIC_FOLDER}${source}`)).toBe(true);
    }
  });
});
