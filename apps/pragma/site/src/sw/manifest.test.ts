import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { DEFAULT_POST_LOGIN_PATH } from '../routes/login.core';

const MANIFEST_PATH = join(
  resolve(dirname(fileURLToPath(import.meta.url)), '..', '..'),
  'public',
  'manifest.webmanifest',
);

const manifestSchema = z.object({
  id: z.string(),
  start_url: z.string(),
  shortcuts: z.array(z.object({ name: z.string(), url: z.string() })),
});

// @FollowsBlueprint test-artifact-audit
describe('manifest.webmanifest, the file the phone installs', () => {
  it('opens a new install on the members area, the page the installed app is sent to from /', () => {
    const manifest = manifestSchema.parse(JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')));
    expect(manifest.start_url).toBe(DEFAULT_POST_LOGIN_PATH);
    expect(manifest.shortcuts.find((shortcut) => shortcut.name === 'Accueil')?.url).toBe(
      DEFAULT_POST_LOGIN_PATH,
    );
  });

  it('keeps the install identity /, so an app installed before the ERP moved stays one app and opens on /', () => {
    const manifest = manifestSchema.parse(JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')));
    expect(manifest.id).toBe('/');
  });
});
