// @FollowsBlueprint utils-pure-module
import { type Check, type HookInput, type HookWorld, PASS, type Verdict } from '../check.core.ts';

type Row = Readonly<Record<string, unknown>>;

const WORD_START = '(?<![\\p{L}\\p{N}_])';
const WORD_END = '(?![\\p{L}\\p{N}_])';
const VISUAL_CLAIM = new RegExp(
  `${WORD_START}(pixel (diff|channel|difference)s?` +
    `|visible differences?|screens? (match|are identical|look the same|unchanged))${WORD_END}`,
  'iu',
);
const QUOTED_SPAN = /"[^"\n]*"|“[^”\n]*”|`[^`\n]*`|(?<=^|\n)[ \t]*>[^\n]*/gu;
const SHOWING_TOOLS = new Set(['Artifact', 'SendUserFile']);
const SHOWN_IN_TEXT = /!\[[^\]]*\]\(|claude\.ai\/(code\/)?artifact\//u;
const PUSH = /\bgit\s+push\b/u;
const PUSH_OR_PULL_REQUEST = /\bgit\s+push\b|create_pull_request/u;
const SCREENSHOTS_TAKEN = /screenshots\/pr-|screenshots\.yml|visual-validation/u;
const SITE_SOURCE = /(?<=^|\n)apps\/[^/]+\/site\/src\//u;
const PENDING_SCREENSHOT =
  /^[^/.][^/]*\/[^/.][^/]*\/validation\/\.pending-upload\/[^/.][^/]*\/[^/.][^/]*$/u;
const FEATURES = 'docs/features';
const LINE_BREAK = /\r\n|\r|\n/u;
const NOT_ASCII_PRINTABLE = /[^\0-~]/gu;
const HEX = 16;
const ESCAPE_WIDTH = 4;

export const REASON =
  '[screens-shown] This turn describes how screens compare but shows none of them. ' +
  'Publish the before and after images (Artifact, or SendUserFile with display render) ' +
  'or link where they are, then give the verdict beside them. ' +
  'See docs/dantotsus/the-screens-described-instead-of-shown.md.';
export const PUSH_REASON =
  '[screens-shown] This turn pushed a change to a screen and posted no new screenshot. ' +
  'Publish the changed screens as open-pr step 5b says. See docs/dantotsus/a-screen-pushed-without-its-picture.md.';
export const PENDING_REASON =
  '[screens-shown] This turn pushed or opened a pull request while validation screenshots ' +
  'still wait in .pending-upload/. Publish them as open-pr step 5b says, then delete the folder.';

class NotATranscript extends Error {}

function isRecord(value: unknown): value is Row {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isTruthy(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (isRecord(value)) return Object.keys(value).length > 0;
  return Boolean(value);
}

function readStopHookActive(input: HookInput): unknown {
  return Object.entries(input).find(([key]) => key === 'stop_hook_active')?.[1];
}

function readMessage(row: Row): Row {
  if (!('message' in row)) return {};
  const message = row['message'];
  if (!isRecord(message)) throw new NotATranscript();
  return message;
}

function readBlocks(row: Row): readonly unknown[] {
  const message = readMessage(row);
  if (!('content' in message)) return [];
  const content = message['content'];
  if (typeof content === 'string' || isRecord(content)) return [];
  if (!Array.isArray(content)) throw new NotATranscript();
  return content;
}

function isToolResult(block: unknown): boolean {
  return isRecord(block) && block['type'] === 'tool_result';
}

function isTurnStart(row: Row): boolean {
  if (row['type'] !== 'user' || isTruthy(row['isMeta'])) return false;
  const content = readMessage(row)['content'];
  if (typeof content === 'string') return true;
  return Array.isArray(content) && !content.some(isToolResult);
}

export function readTurn(transcript: string): Row[] {
  const rows = transcript
    .split(LINE_BREAK)
    .map((line) => line.trim())
    .filter((line) => line !== '')
    .map((line): unknown => JSON.parse(line));
  if (!rows.every(isRecord)) throw new NotATranscript();
  const lastStart = rows.findLastIndex(isTurnStart);
  return lastStart >= 0 ? rows.slice(lastStart + 1) : rows;
}

function readText(block: Row): string {
  const text = 'text' in block ? block['text'] : '';
  if (typeof text !== 'string') throw new NotATranscript();
  return text;
}

export function shouldShowScreens(turn: readonly Row[]): boolean {
  const textParts: string[] = [];
  for (const row of turn) {
    if (row['type'] !== 'assistant' || isTruthy(row['isSidechain'])) continue;
    for (const block of readBlocks(row)) {
      if (!isRecord(block)) continue;
      if (block['type'] === 'tool_use' && SHOWING_TOOLS.has(String(block['name']))) return false;
      if (block['type'] === 'text') textParts.push(readText(block));
    }
  }
  const text = textParts.join('\n');
  return VISUAL_CLAIM.test(text.replace(QUOTED_SPAN, '')) && !SHOWN_IN_TEXT.test(text);
}

function escapeNonAscii(character: string): string {
  return `\\u${character.charCodeAt(0).toString(HEX).padStart(ESCAPE_WIDTH, '0')}`;
}

export function dumpAssistantInputs(turn: readonly Row[]): string {
  const contents = turn
    .filter((row) => row['type'] === 'assistant')
    .map((row) => readMessage(row)['content'] ?? null);
  return JSON.stringify(contents).replace(NOT_ASCII_PRINTABLE, escapeNonAscii);
}

function hasPushedAScreenUnshown(inputs: string, world: HookWorld): boolean {
  if (!PUSH.test(inputs) || SCREENSHOTS_TAKEN.test(inputs)) return false;
  const moves = world
    .run('git', ['reflog', '--format=%H', '-n', '2', '@{upstream}'])
    .stdout.split(/\s+/u)
    .filter((move) => move !== '');
  const [newer, older] = moves;
  if (newer === undefined || older === undefined || moves.length !== 2) return false;
  return SITE_SOURCE.test(world.run('git', ['diff', '--name-only', older, newer]).stdout);
}

function hasLeftScreenshotsUnpublished(inputs: string, root: string, world: HookWorld): boolean {
  if (!PUSH_OR_PULL_REQUEST.test(inputs)) return false;
  const features = `${root}/${FEATURES}`;
  const found = world.run('find', ['-L', features, '-mindepth', '6', '-maxdepth', '6']).stdout;
  return found.split('\n').some((path) => PENDING_SCREENSHOT.test(path.slice(features.length + 1)));
}

function judgeTurn(input: HookInput, world: HookWorld): Verdict {
  if (isTruthy(readStopHookActive(input)) || input.transcript_path === undefined) return PASS;
  const transcript = world.readText(input.transcript_path);
  if (transcript === null) return PASS;
  const turn = readTurn(transcript);
  if (shouldShowScreens(turn)) return { kind: 'block', reason: REASON };
  const inputs = dumpAssistantInputs(turn);
  if (hasLeftScreenshotsUnpublished(inputs, input.cwd ?? '.', world)) {
    return { kind: 'block', reason: PENDING_REASON };
  }
  if (hasPushedAScreenUnshown(inputs, world)) return { kind: 'block', reason: PUSH_REASON };
  return PASS;
}

export const screensShown: Check = {
  name: 'screens-shown',
  tools: null,
  run(input, world) {
    try {
      return judgeTurn(input, world);
    } catch {
      return PASS;
    }
  },
};
