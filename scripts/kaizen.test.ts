import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const KAIZEN_SCRIPT = resolve(import.meta.dirname, 'kaizen.sh');
const ARCHIVE = 'docs/features/pragma/some-feature/kaizen.md';
const EARLIER_LINE = '- [2026-11-01 10:00] `main` the gate cited ADR-0007 and ran nothing';
const REWRITTEN_LINE =
  '- [2026-11-01 10:00] `main` the gate cited ADR-2026-08-08T1538 and ran nothing';
const NEW_LINE = '- [2026-11-11 12:00] `agent` the dev server died at start';
const ENTRY = 'docs/dantotsus/an-entry.md';
const INVENTORY = 'docs/features/meta/lessons-from-pr-1/inventory.md';

const repositories: string[] = [];

function kaizenAfter(
  commits: Record<string, string | null>[],
  ...command: string[]
): { status: number | null; stdout: string } {
  const directory = mkdtempSync(join(tmpdir(), 'kaizen-'));
  repositories.push(directory);
  const environment = {
    ...process.env,
    GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_AUTHOR_NAME: 'sweep',
    GIT_AUTHOR_EMAIL: 'sweep@localhost',
    GIT_COMMITTER_NAME: 'sweep',
    GIT_COMMITTER_EMAIL: 'sweep@localhost',
  };
  const runGit = (...args: string[]): void => {
    execFileSync('git', args, { cwd: directory, env: environment });
  };

  mkdirSync(join(directory, 'scripts'));
  copyFileSync(KAIZEN_SCRIPT, join(directory, 'scripts/kaizen.sh'));
  runGit('init', '-q', '-b', 'main');
  for (const files of commits) {
    for (const [path, content] of Object.entries(files)) {
      mkdirSync(join(directory, dirname(path)), { recursive: true });
      if (content === null) rmSync(join(directory, path));
      else writeFileSync(join(directory, path), content);
    }
    runGit('add', '-A');
    runGit('commit', '-q', '-m', 'step');
  }
  const { status, stdout } = spawnSync(join(directory, 'scripts/kaizen.sh'), command, {
    cwd: directory,
    env: environment,
    encoding: 'utf8',
  });
  return { status, stdout };
}

const archive = (lines: string[]): Record<string, string> => ({
  [ARCHIVE]: `# Friction\n\n${lines.join('\n')}\n`,
});
const sweepInput = (before: string[], after: string[]): string =>
  kaizenAfter([archive(before), archive(after)], 'sweep-input', 'HEAD').stdout;
const lines = (count: number): string => 'line\n'.repeat(count);

afterEach(() => {
  for (const directory of repositories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('kaizen.sh sweep-input', () => {
  it('hands over a line the merge added', () => {
    const output = sweepInput([EARLIER_LINE], [EARLIER_LINE, NEW_LINE]);

    expect(output).toContain(NEW_LINE);
    expect(output).toContain('1 line(s) to sweep');
  });

  it('leaves out a line the merge only rewrote, because an earlier sweep read it', () => {
    const output = sweepInput([EARLIER_LINE], [REWRITTEN_LINE, NEW_LINE]);

    expect(output).not.toContain(REWRITTEN_LINE);
    expect(output).toContain(NEW_LINE);
    expect(output).toContain('1 line(s) to sweep, across 1 archive(s)');
  });
});

describe('kaizen.sh balance', () => {
  it('refuses a sweep that adds more than it removes, a knowledge entry moved into a counted folder included', () => {
    const before = { [ENTRY]: lines(10), 'docs/knowledge/moved.md': lines(5) };
    const sweep = {
      'docs/dantotsus/moved.md': lines(5),
      'docs/knowledge/moved.md': null,
      [ENTRY]: lines(8),
    };
    const { status, stdout } = kaizenAfter([before, sweep], 'balance', 'HEAD^');

    expect(stdout).toContain('Balance: added 5, removed 2 outside');
    expect(status).toBe(1);
  });

  it('passes a sweep that removes as much as it adds, and leaves out what a sweep does not count', () => {
    const sweep = {
      [INVENTORY]: lines(9),
      [ARCHIVE]: lines(9),
      'docs/knowledge/a.md': lines(9),
      'docs/adr/a.md': lines(9),
      'docs/operator-backlog/a.md': lines(9),
      'pnpm-lock.yaml': lines(9),
      'infra/test/__snapshots__/a.json': lines(9),
      'a.sh': lines(3),
      [ENTRY]: lines(7),
    };
    const { status, stdout } = kaizenAfter([{ [ENTRY]: lines(10) }, sweep], 'balance', 'HEAD^');

    expect(stdout).toContain('Balance: added 3, removed 3 outside');
    expect(status).toBe(0);
  });
});
