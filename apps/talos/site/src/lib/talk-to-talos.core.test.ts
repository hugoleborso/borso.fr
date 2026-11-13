import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { TALK_PATH } from './talk-to-talos.core';

const manifestSchema = z.object({
  shortcuts: z.array(
    z.object({ name: z.string(), short_name: z.string().optional(), url: z.string() }),
  ),
});

function readManifestShortcuts() {
  const text = readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), '../../public/manifest.webmanifest'),
    'utf8',
  );
  return manifestSchema.parse(JSON.parse(text)).shortcuts;
}

// @FollowsBlueprint test-pure-unit
describe('the address of « Parler à Talos »', () => {
  it('is the path the home-screen shortcut opens', () => {
    expect(TALK_PATH).toBe('/talk');
    expect(readManifestShortcuts()).toContainEqual({
      name: 'Parler à Talos',
      short_name: 'Parler',
      url: TALK_PATH,
    });
  });

  it('leaves no shortcut to the removed Message screen', () => {
    expect(readManifestShortcuts().map((shortcut) => shortcut.url)).toStrictEqual([
      '/todos',
      '/proposals',
      TALK_PATH,
    ]);
  });
});
