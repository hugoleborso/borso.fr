import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const KAIZEN_SCRIPT = resolve(import.meta.dirname, 'kaizen.sh');
const EXISTING = 'docs/knowledge/an-entry.md';
const RECORDS = {
  'docs/features/meta/lessons-from-pr-1/inventory.md': 9,
  'docs/features/meta/lessons-from-pr-1/validation/report.md': 9,
  'docs/features/pragma/some-feature/kaizen.md': 9,
};

const repositories: string[] = [];

function balance(sweep: Record<string, number>): { status: number | null; stdout: string } {
  const directory = mkdtempSync(join(tmpdir(), 'kaizen-balance-'));
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
  const commit = (files: Record<string, number>): void => {
    for (const [path, lineCount] of Object.entries(files)) {
      mkdirSync(join(directory, dirname(path)), { recursive: true });
      writeFileSync(join(directory, path), 'line\n'.repeat(lineCount));
    }
    execFileSync('git', ['add', '-A'], { cwd: directory, env: environment });
    execFileSync('git', ['commit', '-q', '-m', 'step'], { cwd: directory, env: environment });
  };

  mkdirSync(join(directory, 'scripts'));
  copyFileSync(KAIZEN_SCRIPT, join(directory, 'scripts/kaizen.sh'));
  execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: directory, env: environment });
  commit({ [EXISTING]: 10 });
  execFileSync('git', ['checkout', '-q', '-b', 'sweep'], { cwd: directory, env: environment });
  commit(sweep);
  const { status, stdout } = spawnSync(join(directory, 'scripts/kaizen.sh'), ['balance', 'main'], {
    cwd: directory,
    env: environment,
    encoding: 'utf8',
  });
  return { status, stdout };
}

afterEach(() => {
  for (const directory of repositories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('kaizen.sh balance', () => {
  it('refuses a sweep that adds more than it removes', () => {
    const { status, stdout } = balance({ 'docs/dantotsus/a-new-entry.md': 5, [EXISTING]: 8 });

    expect(stdout).toContain('Balance: added 5, removed 2 outside');
    expect(status).toBe(1);
  });

  it('passes a sweep that removes as much as it adds, and does not count its records', () => {
    const { status, stdout } = balance({ ...RECORDS, 'scripts/a-check.sh': 3, [EXISTING]: 7 });

    expect(stdout).toContain('Balance: added 3, removed 3 outside');
    expect(status).toBe(0);
  });
});
