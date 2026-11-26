import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

const MANIFEST_PATH = join(
  resolve(dirname(fileURLToPath(import.meta.url)), '..', '..'),
  'public',
  'manifest.webmanifest',
);

const manifestSchema = z.object({
  start_url: z.string(),
  shortcuts: z.array(z.object({ name: z.string(), url: z.string() })),
});

// @FollowsBlueprint test-artifact-audit
describe('manifest.webmanifest, the file the phone installs', () => {
  it('opens the installed app on the members area, since the public sign-up page took /', () => {
    const manifest = manifestSchema.parse(JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')));
    expect(manifest.start_url).toBe('/app');
    expect(manifest.shortcuts.find((shortcut) => shortcut.name === 'Accueil')?.url).toBe('/app');
  });
});
