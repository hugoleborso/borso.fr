import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const RANGE_SCRIPT = resolve(import.meta.dirname, 'pre-push-range.sh');
const VARIABLES_A_HOOK_SETS = ['GIT_DIR', 'GIT_INDEX_FILE', 'GIT_WORK_TREE', 'GIT_PREFIX'];

const repositories: string[] = [];

function isolatedEnvironment(): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = {
    ...process.env,
    GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_AUTHOR_NAME: 'range',
    GIT_AUTHOR_EMAIL: 'range@localhost',
    GIT_COMMITTER_NAME: 'range',
    GIT_COMMITTER_EMAIL: 'range@localhost',
  };
  for (const variable of VARIABLES_A_HOOK_SETS) {
    delete environment[variable];
  }
  return environment;
}

function createRepository() {
  const directory = mkdtempSync(join(tmpdir(), 'pre-push-range-'));
  repositories.push(directory);
  const runGit = (...args: string[]): string =>
    execFileSync('git', args, {
      cwd: directory,
      env: isolatedEnvironment(),
      encoding: 'utf8',
    }).trim();
  const commitFiles = (message: string, files: Record<string, string>): string => {
    for (const [path, content] of Object.entries(files)) {
      writeFileSync(join(directory, path), content);
    }
    runGit('add', '-A');
    runGit('commit', '-q', '-m', message);
    return runGit('rev-parse', 'HEAD');
  };
  const publishMain = (): void => {
    runGit('update-ref', 'refs/remotes/origin/main', 'main');
  };
  const gatedRange = (remoteSha: string): { label: string; files: string[] } => {
    const [base = '', label = ''] = execFileSync(RANGE_SCRIPT, [remoteSha], {
      cwd: directory,
      env: isolatedEnvironment(),
      encoding: 'utf8',
    }).split('\n');
    const files = runGit('diff', '--name-only', base, 'HEAD').split('\n').filter(Boolean);
    return { label, files };
  };

  runGit('init', '-q', '-b', 'main');
  commitFiles('base', { 'shared.txt': 'one\ntwo\nthree\n' });
  publishMain();
  runGit('checkout', '-q', '-b', 'feature');
  return { runGit, commitFiles, publishMain, gatedRange };
}

function nineFiles(): Record<string, string> {
  return Object.fromEntries(
    Array.from({ length: 9 }, (_, index) => [`feature-${index}.txt`, `${index}\n`]),
  );
}

afterEach(() => {
  for (const directory of repositories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('pre-push-range.sh', () => {
  it('gates the whole branch when the branch is new upstream', () => {
    const repository = createRepository();
    repository.commitFiles('feature', { 'feature.txt': 'a\n' });

    expect(repository.gatedRange('')).toEqual({
      label: 'the whole branch since main (no remote ref for this branch yet)',
      files: ['feature.txt'],
    });
  });

  it('gates only the new commits on an ordinary push', () => {
    const repository = createRepository();
    const pushed = repository.commitFiles('feature', nineFiles());
    repository.commitFiles('more', { 'extra.txt': 'x\n' });

    expect(repository.gatedRange(pushed)).toEqual({ label: 'this push', files: ['extra.txt'] });
  });

  it('gates the branch since main when the push rewrites the branch', () => {
    const repository = createRepository();
    const pushed = repository.commitFiles('abandoned', nineFiles());
    repository.runGit('checkout', '-q', '-B', 'feature', 'main');
    repository.commitFiles('restart', { 'restart.txt': 'r\n' });

    expect(repository.gatedRange(pushed)).toEqual({
      label: 'the whole branch since main (the push rewrites the branch)',
      files: ['restart.txt'],
    });
  });

  it('gates neither main nor the work already pushed when the push merges main in', () => {
    const repository = createRepository();
    const pushed = repository.commitFiles('feature', nineFiles());
    repository.runGit('checkout', '-q', 'main');
    repository.commitFiles('one line on main', { 'main.txt': 'm\n' });
    repository.publishMain();
    repository.runGit('checkout', '-q', 'feature');
    repository.runGit('merge', '-q', '--no-edit', 'main');
    repository.commitFiles('after the merge', { 'extra.txt': 'x\n' });
    repository.runGit('checkout', '-q', 'main');
    repository.commitFiles('main moves after the merge', { 'later.txt': 'l\n' });
    repository.publishMain();
    repository.runGit('checkout', '-q', 'feature');

    expect(repository.gatedRange(pushed)).toEqual({
      label: 'this push, minus the commits it merged from origin/main',
      files: ['extra.txt'],
    });
  });

  it('gates a file both sides changed, since neither gate saw the two together', () => {
    const repository = createRepository();
    const pushed = repository.commitFiles('feature', { 'shared.txt': 'ONE\ntwo\nthree\n' });
    repository.runGit('checkout', '-q', 'main');
    repository.commitFiles('main', { 'shared.txt': 'one\ntwo\nTHREE\n' });
    repository.publishMain();
    repository.runGit('checkout', '-q', 'feature');
    repository.runGit('merge', '-q', '--no-edit', 'main');

    expect(repository.gatedRange(pushed).files).toEqual(['shared.txt']);
  });

  it('gates a conflict the merge resolved', () => {
    const repository = createRepository();
    const pushed = repository.commitFiles('feature', { 'shared.txt': 'feature\n' });
    repository.runGit('checkout', '-q', 'main');
    repository.commitFiles('main', { 'shared.txt': 'main\n', 'main.txt': 'm\n' });
    repository.publishMain();
    repository.runGit('checkout', '-q', 'feature');
    expect(() => repository.runGit('merge', '-q', '--no-edit', 'main')).toThrow();
    repository.commitFiles('resolve', { 'shared.txt': 'resolved\n' });

    expect(repository.gatedRange(pushed).files).toEqual(['shared.txt']);
  });
});
