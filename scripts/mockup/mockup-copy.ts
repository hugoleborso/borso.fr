#!/usr/bin/env tsx
import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { z } from 'zod';
import {
  type ArtboardSource,
  selectWordyArtboards,
  WORDY_ARTBOARD_LIMIT,
} from './mockup-copy.core';

const fileSourceSchema = z.union([z.string(), z.object({ from: z.string() }).loose()]);

const hookInputSchema = z.object({
  cwd: z.string().optional(),
  tool_input: z
    .object({
      file_path: z.string().optional(),
      root: z.string().optional(),
      files: z.record(z.string(), fileSourceSchema.nullable()).optional(),
    })
    .loose(),
});

function readSources(input: z.infer<typeof hookInputSchema>): ArtboardSource[] {
  const workingDirectory = input.cwd ?? process.cwd();
  const root = resolve(workingDirectory, input.tool_input.root ?? '.');
  const paths: string[] = [];
  if (input.tool_input.file_path !== undefined) paths.push(input.tool_input.file_path);
  for (const source of Object.values(input.tool_input.files ?? {})) {
    if (source === null) continue;
    paths.push(typeof source === 'string' ? source : source.from);
  }
  return paths
    .map((path) => (isAbsolute(path) ? path : resolve(root, path)))
    .filter((path) => existsSync(path))
    .map((path) => ({ path, html: readFileSync(path, 'utf8') }));
}

const parsed = hookInputSchema.safeParse(JSON.parse(readFileSync(0, 'utf8')));
if (!parsed.success) process.exit(0);

const wordy = selectWordyArtboards(readSources(parsed.data), WORDY_ARTBOARD_LIMIT);
if (wordy.length === 0) process.exit(0);

const listing = wordy.map((artboard) => `  ${artboard.path}: ${artboard.words} words`).join('\n');
const note = `[mockup-copy] These screens carry more than ${WORDY_ARTBOARD_LIMIT} visible words:
${listing}

The operator corrected "too much text" on mockups more than once. A word stays only where no icon, number, image or player mark can carry the meaning. Replace sentences and labels before you show the screen: a check icon over "Valider la manche", the card image over "Sirène prise par un pirate", the player's mark over the name.`;

process.stdout.write(
  JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', additionalContext: note } }),
);
