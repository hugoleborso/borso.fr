import { describe, expect, it } from 'vitest';
import type { CommandResult, HookInput, HookWorld } from '../check.core.ts';
import { PASS } from '../check.core.ts';
import {
  dumpAssistantInputs,
  isTruthy,
  shouldShowScreens,
  PENDING_REASON,
  PUSH_REASON,
  readTurn,
  REASON,
  screensShown,
} from './screens-shown.core.ts';

const TRANSCRIPT = '/t/transcript.jsonl';
const OK: CommandResult = { status: 0, stdout: '', stderr: '' };

const user = (content: unknown, extra: object = {}): object => ({
  type: 'user',
  message: { content },
  ...extra,
});
const said = (...blocks: readonly unknown[]): object => ({
  type: 'assistant',
  message: { content: blocks },
});
const text = (value: unknown): object => ({ type: 'text', text: value });
const tool = (name: string, input: object = {}): object => ({ type: 'tool_use', name, input });
const toolResult = user([{ type: 'tool_result', content: 'ok' }]);
const PUSHED = said(tool('Bash', { command: 'git push origin HEAD' }));

function lines(...rows: readonly object[]): string {
  return rows.map((row) => JSON.stringify(row)).join('\n');
}

interface WorldOptions {
  readonly transcript?: string | null;
  readonly reflog?: string;
  readonly diff?: string;
  readonly found?: string;
}

function createWorld(options: WorldOptions): { world: HookWorld; runs: string[][] } {
  const runs: string[][] = [];
  const world: HookWorld = {
    projectDirectory: '/repo',
    readEnvironment: () => undefined,
    readText: (path) => (path === TRANSCRIPT ? (options.transcript ?? null) : null),
    run: (command, args) => {
      runs.push([command, ...args]);
      if (command === 'find') return { ...OK, stdout: options.found ?? '' };
      if (args[0] === 'reflog') return { ...OK, stdout: options.reflog ?? '' };
      return { ...OK, stdout: options.diff ?? '' };
    },
  };
  return { world, runs };
}

function judge(transcript: string | null, options: WorldOptions = {}, extra: object = {}): unknown {
  const input: HookInput = {
    hook_event_name: 'Stop',
    transcript_path: TRANSCRIPT,
    cwd: '/repo',
    ...extra,
  };
  return screensShown.run(input, createWorld({ ...options, transcript }).world);
}

function rowsOf(...rows: readonly object[]): Readonly<Record<string, unknown>>[] {
  return readTurn(lines(...rows));
}

// @FollowsBlueprint test-pure-unit
describe('isTruthy reads a value as Python does', () => {
  it('reads an empty list, an empty dict, zero and an empty string as false', () => {
    expect([[], {}, 0, '', null, undefined].map(isTruthy)).toEqual([
      false,
      false,
      false,
      false,
      false,
      false,
    ]);
    expect([[1], { a: 1 }, 1, 'x', true].map(isTruthy)).toEqual([true, true, true, true, true]);
  });
});

describe('readTurn keeps the rows after the last message the person typed', () => {
  it('reads a string or a list without a tool result as a turn start', () => {
    const turn = rowsOf(user('a'), said(text('one')), user([text('b')]), said(text('two')));

    expect(turn).toEqual([said(text('two'))]);
  });

  it('reads neither a tool result, a meta row nor a row with no content as a turn start', () => {
    const rows = [user('a'), toolResult, user('note', { isMeta: true }), { type: 'user' }];

    expect(rowsOf(...rows)).toHaveLength(3);
  });

  it('keeps every row when no turn start is found, and splits any line break', () => {
    expect(readTurn(`${JSON.stringify(said())}\r\n\r${JSON.stringify(said())}\n  \n`)).toHaveLength(
      2,
    );
  });
});

describe('shouldShowScreens', () => {
  it('asks to show a turn that claims screens compare and shows nothing', () => {
    expect(shouldShowScreens(rowsOf(said(text('Screens match: no visible differences.'))))).toBe(
      true,
    );
  });

  it('skips a claim in quotes, in backticks, in curly quotes or in a blockquote', () => {
    const quoted = '"screens match" `pixel diff` “visible differences”\n  > screens unchanged';

    expect(shouldShowScreens(rowsOf(said(text(quoted))))).toBe(false);
  });

  it('reads a claim only at word boundaries, letters with accents included', () => {
    expect(shouldShowScreens(rowsOf(said(text('épixel diff'))))).toBe(false);
  });

  it('lets a turn end that published an Artifact, sent a file or embedded an image', () => {
    expect(shouldShowScreens(rowsOf(said(tool('Artifact'), text('Screens match.'))))).toBe(false);
    expect(shouldShowScreens(rowsOf(said(text('Screens match. ![a](b.png)'))))).toBe(false);
    expect(shouldShowScreens(rowsOf(said(text('Screens match, claude.ai/code/artifact/x'))))).toBe(
      false,
    );
  });

  it('ignores a subagent row, a user row, a block that is not a dict and another tool', () => {
    const sidechain = { ...said(text('Screens match.')), isSidechain: true };
    const rows = [sidechain, toolResult, said('screens match', tool('Bash'))];

    expect(shouldShowScreens(rowsOf(...rows))).toBe(false);
  });

  it('reads a text block with no text, and a message with no content, as empty', () => {
    const rows = [
      said({ type: 'text' }),
      { type: 'assistant', message: {} },
      { type: 'assistant' },
    ];

    expect(shouldShowScreens(rowsOf(...rows))).toBe(false);
  });

  it('reads content that is a string or a dict as holding no block', () => {
    const rows = [
      { type: 'assistant', message: { content: 'screens match' } },
      { type: 'assistant', message: { content: { a: 'screens match' } } },
    ];

    expect(shouldShowScreens(rowsOf(...rows))).toBe(false);
  });
});

describe('dumpAssistantInputs dumps what the assistant sent as Python json.dumps did', () => {
  it('escapes every character past ASCII, so a non-breaking space never reads as a space', () => {
    const turn = rowsOf(said(text('git push\u007f')), { type: 'assistant' }, toolResult);

    expect(dumpAssistantInputs(turn)).toBe(
      '[[{"type":"text","text":"git\\u00a0push\\u007f"}],null]',
    );
  });
});

describe('screensShown', () => {
  it('blocks a turn that describes screens it never showed', () => {
    expect(judge(lines(user('x'), said(text('Pixel diffs are zero.'))))).toEqual({
      kind: 'block',
      reason: REASON,
    });
  });

  it('blocks a push while screenshots wait in a pending upload folder', () => {
    const found = [
      '/repo/docs/features/app/feat/validation/.pending-upload/.hidden/shot.png',
      '/repo/docs/features/app/feat/validation/.pending-upload/run/shot.png',
    ].join('\n');

    expect(judge(lines(user('x'), PUSHED), { found })).toEqual({
      kind: 'block',
      reason: PENDING_REASON,
    });
  });

  it('looks for pending screenshots under the current folder when no cwd is given', () => {
    const fake = createWorld({ transcript: lines(PUSHED) });
    screensShown.run({ hook_event_name: 'Stop', transcript_path: TRANSCRIPT }, fake.world);

    expect(fake.runs[0]).toEqual([
      'find',
      '-L',
      './docs/features',
      '-mindepth',
      '6',
      '-maxdepth',
      '6',
    ]);
  });

  it('reads a pull request opened through MCP as a push', () => {
    const opened = said(tool('mcp__github__create_pull_request'));
    const found = '/repo/docs/features/a/b/validation/.pending-upload/r/s.png';

    expect(judge(lines(opened), { found })).toEqual({ kind: 'block', reason: PENDING_REASON });
  });

  it('blocks a push whose last move upstream touched a site source', () => {
    const options = { reflog: 'new\nold\n', diff: 'README.md\napps/pragma/site/src/a.tsx\n' };
    const fake = createWorld({ ...options, transcript: lines(PUSHED) });

    expect(
      screensShown.run({ hook_event_name: 'Stop', transcript_path: TRANSCRIPT }, fake.world),
    ).toEqual({ kind: 'block', reason: PUSH_REASON });
    expect(fake.runs.at(-1)).toEqual(['git', 'diff', '--name-only', 'old', 'new']);
  });

  it('lets a push end that touched no site source, or has not two upstream moves', () => {
    expect(judge(lines(PUSHED), { reflog: 'new old', diff: 'apps/a/api/src/x.ts' })).toBe(PASS);
    expect(judge(lines(PUSHED), { reflog: '' })).toBe(PASS);
    expect(judge(lines(PUSHED), { reflog: 'one' })).toBe(PASS);
    expect(judge(lines(PUSHED), { reflog: 'a b c' })).toBe(PASS);
  });

  it('lets a push end that posted screenshots, and a turn that pushed nothing', () => {
    const shown = said(tool('Bash', { command: 'git push && ls screenshots/pr-1' }));

    expect(judge(lines(shown), { reflog: 'a b', diff: 'apps/a/site/src/x.ts' })).toBe(PASS);
    expect(judge(lines(said(text('done'))))).toBe(PASS);
  });

  it('lets the turn end when the stop hook already blocked it once', () => {
    expect(judge(lines(said(text('Screens match.'))), {}, { stop_hook_active: true })).toBe(PASS);
  });

  it('lets the turn end with no transcript, or one it cannot read', () => {
    const input: HookInput = { hook_event_name: 'Stop' };

    expect(screensShown.run(input, createWorld({}).world)).toBe(PASS);
    expect(judge(null)).toBe(PASS);
  });

  it('lets the turn end on any transcript it cannot parse, as the old hook did on any error', () => {
    expect(judge('{"type":')).toBe(PASS);
    expect(judge('[1]')).toBe(PASS);
    expect(judge(lines({ type: 'assistant', message: 'x' }))).toBe(PASS);
    expect(judge(lines({ type: 'assistant', message: { content: 3 } }))).toBe(PASS);
    expect(judge(lines(said(text(3))))).toBe(PASS);
  });
});
