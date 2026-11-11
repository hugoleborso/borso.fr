import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const KAIZEN_SCRIPT = resolve(import.meta.dirname, 'kaizen.sh');
const ARCHIVE = 'docs/features/pragma/some-feature/kaizen.md';
const EARLIER_LINE = '- [2026-11-01 10:00] `main` the gate cited ADR-0007 and ran nothing';
const REWRITTEN_LINE =
  '- [2026-11-01 10:00] `main` the gate cited ADR-2026-08-08T1538 and ran nothing';
const NEW_LINE = '- [2026-11-11 12:00] `agent` the dev server died at start';

const repositories: string[] = [];

function sweepInput(before: string[], after: string[]): string {
  const directory = mkdtempSync(join(tmpdir(), 'kaizen-sweep-'));
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
  const commitArchive = (lines: string[]): void => {
    writeFileSync(join(directory, ARCHIVE), `# Friction\n\n${lines.join('\n')}\n`);
    runGit('add', '-A');
    runGit('commit', '-q', '-m', 'archive');
  };

  mkdirSync(join(directory, 'scripts'));
  mkdirSync(join(directory, 'docs/features/pragma/some-feature'), { recursive: true });
  copyFileSync(KAIZEN_SCRIPT, join(directory, 'scripts/kaizen.sh'));
  runGit('init', '-q', '-b', 'main');
  commitArchive(before);
  commitArchive(after);
  return execFileSync(join(directory, 'scripts/kaizen.sh'), ['sweep-input', 'HEAD'], {
    cwd: directory,
    env: environment,
    encoding: 'utf8',
  });
}

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
