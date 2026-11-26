import { describe, expect, it } from 'vitest';
import { type CommandResult, type HookInput, type HookWorld, PASS } from '../check.core.ts';
import {
  deriveWriteConfig,
  lintWrite,
  resolveProjectFile,
  selectReportLines,
} from './lint-write.core.ts';

interface RecordedCall {
  readonly command: string;
  readonly args: readonly string[];
  readonly input?: string;
}

interface WorldSetup {
  readonly texts?: Readonly<Record<string, string>>;
  readonly realpaths?: string;
  readonly hasOxlint?: boolean;
  readonly isConfigStale?: boolean;
  readonly mktempStatus?: number;
  readonly teeStatus?: number;
  readonly lintResult?: CommandResult;
}

const SOURCE_CONFIG = '{\n  "plugins": ["x"],\n  "options": { "typeAware": true }\n}\n';
const FILE = '/repo/src/a.ts';
const REPORT = 'src/a.ts:3:7: Unexpected comment [borso/no-comments]\n\n1 problem\n';

function result(status: number, stdout = ''): CommandResult {
  return { status, stdout, stderr: '' };
}

function fakeWorld(calls: RecordedCall[], setup: WorldSetup = {}): HookWorld {
  const texts = setup.texts ?? { [FILE]: 'code', '/repo/.oxlintrc.json': SOURCE_CONFIG };
  const answers: Readonly<Record<string, CommandResult>> = {
    realpath: result(0, setup.realpaths ?? '/repo\n/repo/src\n'),
    mktemp: result(setup.mktempStatus ?? 0, '/repo/.oxlintrc.write.abc123\n'),
    tee: result(setup.teeStatus ?? 0),
    '/repo/node_modules/.bin/oxlint': setup.lintResult ?? result(1, REPORT),
  };
  return {
    projectDirectory: '/repo',
    readEnvironment: () => undefined,
    readText: (path) => texts[path] ?? null,
    run: (command, args, input) => {
      calls.push(input === undefined ? { command, args } : { command, args, input });
      if (command === 'test' && args[0] === '-x') return result(setup.hasOxlint === false ? 1 : 0);
      if (command === 'test') return result(setup.isConfigStale === true ? 0 : 1);
      return answers[command] ?? result(0);
    },
  };
}

function writeCall(filePath: unknown): HookInput {
  return { hook_event_name: 'PostToolUse', tool_name: 'Edit', tool_input: { file_path: filePath } };
}

function commandsOf(calls: readonly RecordedCall[]): string[] {
  return calls.map(({ command }) => command);
}

// @FollowsBlueprint test-pure-unit
describe('deriveWriteConfig', () => {
  it('turns type-aware rules and unused-directive reports off, keeping key order', () => {
    expect(deriveWriteConfig(SOURCE_CONFIG)).toBe(
      '{\n  "plugins": [\n    "x"\n  ],\n  "options": {\n    "typeAware": false,\n    "reportUnusedDisableDirectives": "off"\n  }\n}\n',
    );
  });

  it('adds the options at the end when the config has none', () => {
    expect(deriveWriteConfig('{"rules":{}}')).toBe(
      '{\n  "rules": {},\n  "options": {\n    "typeAware": false,\n    "reportUnusedDisableDirectives": "off"\n  }\n}\n',
    );
  });

  it('gives up on a config jq could not edit', () => {
    expect(deriveWriteConfig('not json')).toBeNull();
    expect(deriveWriteConfig('[1]')).toBeNull();
    expect(deriveWriteConfig('{"options": false}')).toBeNull();
  });
});

describe('selectReportLines', () => {
  it('keeps the first ten report lines and drops the summary and indented lines', () => {
    const lines = Array.from({ length: 12 }, (_, index) => `a.ts:${index + 1}:1: rule`);
    const report = [' indented.ts:1:1: x', ...lines, '', '12 problems'].join('\n');

    expect(selectReportLines(report)).toBe(lines.slice(0, 10).join('\n'));
  });
});

describe('resolveProjectFile', () => {
  it('reads the file under the physical project root', () => {
    const calls: RecordedCall[] = [];

    expect(resolveProjectFile('/link/src/a.ts', fakeWorld(calls))).toEqual({
      root: '/repo',
      path: '/repo/src/a.ts',
    });
    expect(calls).toEqual([{ command: 'realpath', args: ['-e', '--', '/repo', '/link/src'] }]);
  });

  it('skips a subagent worktree, whose paths miss the config override globs', () => {
    const world = fakeWorld([], { realpaths: '/repo\n/repo/.claude/worktrees/agent-1/src\n' });

    expect(resolveProjectFile('/x/a.ts', world)).toBeNull();
  });

  it('skips a file outside the root and a folder that does not resolve', () => {
    expect(
      resolveProjectFile('/x/a.ts', fakeWorld([], { realpaths: '/repo\n/repo2\n' })),
    ).toBeNull();
    expect(resolveProjectFile('/x/a.ts', fakeWorld([], { realpaths: '' }))).toBeNull();
  });
});

describe('lintWrite', () => {
  it('fires on Edit, Write and MultiEdit only', () => {
    expect(lintWrite.tools?.test('Edit')).toBe(true);
    expect(lintWrite.tools?.test('Bash')).toBe(false);
  });

  it('hands back the report lines of the file just written', () => {
    const calls: RecordedCall[] = [];

    expect(lintWrite.run(writeCall(FILE), fakeWorld(calls))).toEqual({
      kind: 'context',
      text: '[lint] The file just written breaks a rule the commit gate enforces. Each message names the lesson behind it; fix the shape now rather than build on it:\n\nsrc/a.ts:3:7: Unexpected comment [borso/no-comments]',
    });
    expect(calls.at(-1)).toEqual({
      command: '/repo/node_modules/.bin/oxlint',
      args: ['-c', '.oxlintrc.write.json', '--quiet', '--format=unix', 'src/a.ts'],
    });
  });

  it('rebuilds the write config through a staging file when the source config is newer', () => {
    const calls: RecordedCall[] = [];
    lintWrite.run(writeCall(FILE), fakeWorld(calls, { isConfigStale: true }));

    expect(calls.slice(3, 6)).toEqual([
      { command: 'mktemp', args: ['/repo/.oxlintrc.write.XXXXXX'] },
      {
        command: 'tee',
        args: ['/repo/.oxlintrc.write.abc123'],
        input: deriveWriteConfig(SOURCE_CONFIG),
      },
      {
        command: 'mv',
        args: ['-f', '/repo/.oxlintrc.write.abc123', '/repo/.oxlintrc.write.json'],
      },
    ]);
    expect(calls[2]).toEqual({
      command: 'test',
      args: [
        '!',
        '-f',
        '/repo/.oxlintrc.write.json',
        '-o',
        '/repo/.oxlintrc.json',
        '-nt',
        '/repo/.oxlintrc.write.json',
      ],
    });
  });

  it('removes the staging file and lints nothing when it cannot be written', () => {
    const calls: RecordedCall[] = [];

    expect(
      lintWrite.run(writeCall(FILE), fakeWorld(calls, { isConfigStale: true, teeStatus: 1 })),
    ).toBe(PASS);
    expect(commandsOf(calls).slice(3)).toEqual(['mktemp', 'tee', 'rm']);
  });

  it('lints nothing when no staging file can be made or the source config cannot be edited', () => {
    const noStaging = fakeWorld([], { isConfigStale: true, mktempStatus: 1 });
    const badConfig = fakeWorld([], {
      isConfigStale: true,
      texts: { [FILE]: 'code', '/repo/.oxlintrc.json': '[' },
    });

    expect(lintWrite.run(writeCall(FILE), noStaging)).toBe(PASS);
    expect(lintWrite.run(writeCall(FILE), badConfig)).toBe(PASS);
  });

  it('stays silent unless oxlint exits 1 with at least one report line', () => {
    expect(lintWrite.run(writeCall(FILE), fakeWorld([], { lintResult: result(0) }))).toBe(PASS);
    expect(lintWrite.run(writeCall(FILE), fakeWorld([], { lintResult: result(2, REPORT) }))).toBe(
      PASS,
    );
    expect(lintWrite.run(writeCall(FILE), fakeWorld([], { lintResult: result(1, 'oops\n') }))).toBe(
      PASS,
    );
  });

  it('stays silent where oxlint or its config is missing', () => {
    const noConfig = fakeWorld([], { texts: { [FILE]: 'code' } });

    expect(lintWrite.run(writeCall(FILE), fakeWorld([], { hasOxlint: false }))).toBe(PASS);
    expect(lintWrite.run(writeCall(FILE), noConfig)).toBe(PASS);
  });

  it('stays silent on a file outside the project', () => {
    const world = fakeWorld([], {
      realpaths: '/repo\n/tmp/scratch\n',
      texts: { '/tmp/scratch/a.ts': 'code' },
    });

    expect(lintWrite.run(writeCall('/tmp/scratch/a.ts'), world)).toBe(PASS);
  });

  it('runs nothing for a file that is not code or does not exist', () => {
    const calls: RecordedCall[] = [];
    const world = fakeWorld(calls);

    expect(lintWrite.run(writeCall('/repo/a.json'), world)).toBe(PASS);
    expect(lintWrite.run(writeCall('/repo/missing.ts'), world)).toBe(PASS);
    expect(lintWrite.run(writeCall(null), world)).toBe(PASS);
    expect(calls).toEqual([]);
  });
});
