// @FollowsBlueprint utils-pure-module
import { isAbsolute, join } from 'node:path';
import {
  type ArtboardSource,
  selectWordyArtboards,
  WORDY_ARTBOARD_LIMIT,
  type WordyArtboard,
} from '../../mockup/mockup-copy.core.ts';
import { type Check, type HookInput, type HookWorld, PASS } from '../check.core.ts';

const MOCKUP_SUFFIX = '.dc.html';

interface PublishedSources {
  readonly workingDirectory: string;
  readonly root: string | undefined;
  readonly paths: readonly string[];
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isOptionalText(value: unknown): value is string | undefined {
  return value === undefined || typeof value === 'string';
}

function readFileSource(source: unknown): string | null | undefined {
  if (source === null || typeof source === 'string') return source;
  return isRecord(source) && typeof source['from'] === 'string' ? source['from'] : undefined;
}

function readFileSources(files: unknown): (string | null)[] | undefined {
  if (files === undefined) return [];
  if (!isRecord(files)) return undefined;
  const sources = Object.values(files).map(readFileSource);
  return sources.every((source) => source !== undefined) ? sources : undefined;
}

export function readPublishedSources(input: HookInput): PublishedSources | null {
  const toolInput = input.tool_input;
  if (!isOptionalText(input.cwd) || !isRecord(toolInput)) return null;
  const filePath = toolInput['file_path'];
  const root = toolInput['root'];
  const sources = readFileSources(toolInput['files']);
  if (!isOptionalText(filePath) || !isOptionalText(root) || sources === undefined) return null;
  const filePaths = filePath === undefined ? [] : [filePath];
  const sourcePaths = sources.filter((source) => source !== null);
  return { workingDirectory: input.cwd ?? '.', root, paths: [...filePaths, ...sourcePaths] };
}

function isMockupPublish(input: HookInput): boolean {
  const action = input.tool_input?.['action'] ?? false;
  if (action !== false && action !== 'publish') return false;
  const filePath = input.tool_input?.['file_path'];
  const files = input.tool_input?.['files'];
  const names = [
    ...(typeof filePath === 'string' ? [filePath] : []),
    ...(isRecord(files) ? Object.keys(files) : []),
  ];
  return names.some((name) => name.endsWith(MOCKUP_SUFFIX));
}

function resolveFrom(base: string, path: string): string {
  return isAbsolute(path) ? path : join(base, path);
}

function readArtboards(sources: PublishedSources, world: HookWorld): ArtboardSource[] {
  const root = resolveFrom(sources.workingDirectory, sources.root ?? '.');
  return sources.paths.flatMap((source) => {
    const path = resolveFrom(root, source);
    const html = world.readText(path);
    return html === null ? [] : [{ path, html }];
  });
}

export function describeWordyArtboards(wordy: readonly WordyArtboard[]): string {
  const listing = wordy.map((artboard) => `  ${artboard.path}: ${artboard.words} words`).join('\n');
  return `[mockup-copy] These screens carry more than ${WORDY_ARTBOARD_LIMIT} visible words:
${listing}

The operator corrected "too much text" on mockups more than once. A word stays only where no icon, number, image or player mark can carry the meaning. Replace sentences and labels before you show the screen: a check icon over "Valider la manche", the card image over "Sirène prise par un pirate", the player's mark over the name.`;
}

export const mockupCopy: Check = {
  name: 'mockup-copy',
  tools: /^Artifact$/u,
  run: (input, world) => {
    if (!isMockupPublish(input)) return PASS;
    const sources = readPublishedSources(input);
    if (sources === null) return PASS;
    const wordy = selectWordyArtboards(readArtboards(sources, world), WORDY_ARTBOARD_LIMIT);
    if (wordy.length === 0) return PASS;
    return { kind: 'context', text: describeWordyArtboards(wordy) };
  },
};
