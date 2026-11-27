import { execFileSync, spawnSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const KAIZEN_SCRIPT = resolve(import.meta.dirname, 'kaizen.sh');
const FRICTION_LOG = 'docs/kaizen/claude/some-feature.md';
const ENTRY = 'scripts/an-entry.sh';
const INVENTORY = 'docs/features/meta/lessons-from-pr-1/inventory.md';

const repositories: string[] = [];

interface Repository {
  readonly directory: string;
  readonly git: (...args: string[]) => string;
  readonly kaizen: (
    checkout: string,
    ...command: string[]
  ) => { status: number | null; stdout: string };
}

function createRepository(commits: Record<string, string | null>[]): Repository {
  const directory = mkdtempSync(join(tmpdir(), 'kaizen-'));
  repositories.push(directory);
  const { KAIZEN_AGENT: _inheritedWriter, ...inherited } = process.env;
  const environment = {
    ...inherited,
    GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_AUTHOR_NAME: 'sweep',
    GIT_AUTHOR_EMAIL: 'sweep@localhost',
    GIT_COMMITTER_NAME: 'sweep',
    GIT_COMMITTER_EMAIL: 'sweep@localhost',
  };
  const git = (...args: string[]): string =>
    execFileSync('git', args, { cwd: directory, env: environment, encoding: 'utf8' });

  mkdirSync(join(directory, 'scripts'));
  copyFileSync(KAIZEN_SCRIPT, join(directory, 'scripts/kaizen.sh'));
  git('init', '-q', '-b', 'main');
  for (const files of commits) {
    for (const [path, content] of Object.entries(files)) {
      mkdirSync(join(directory, dirname(path)), { recursive: true });
      if (content === null) rmSync(join(directory, path));
      else writeFileSync(join(directory, path), content);
    }
    git('add', '-A');
    git('commit', '-q', '-m', 'step');
  }
  const kaizen = (checkout: string, ...command: string[]) => {
    const { status, stdout } = spawnSync(join(checkout, 'scripts/kaizen.sh'), command, {
      cwd: checkout,
      env: environment,
      encoding: 'utf8',
    });
    return { status, stdout };
  };
  return { directory, git, kaizen };
}

function kaizenAfter(
  commits: Record<string, string | null>[],
  ...command: string[]
): { status: number | null; stdout: string } {
  const repository = createRepository(commits);
  return repository.kaizen(repository.directory, ...command);
}

const lines = (count: number): string => 'line\n'.repeat(count);

afterEach(() => {
  for (const directory of repositories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('kaizen.sh balance', () => {
  it('refuses a sweep that adds more code than it removes, whatever markdown it cuts', () => {
    const before = { [ENTRY]: lines(2), 'docs/standards/a.md': lines(9) };
    const sweep = { 'scripts/new.ts': lines(5), 'docs/standards/a.md': lines(1) };
    const { status, stdout } = kaizenAfter([before, { ...sweep, [ENTRY]: '' }], 'balance', 'HEAD^');

    expect(stdout).toContain('Balance: added 5, removed 2 outside');
    expect(status).toBe(1);
  });

  it("lets a sweep through that commits the operator's waiver", () => {
    const sweep = {
      'scripts/new.ts': lines(5),
      'docs/features/meta/lessons-from-pr-9/balance-waiver.md': lines(1),
    };
    const { status, stdout } = kaizenAfter([{ [ENTRY]: lines(1) }, sweep], 'balance', 'HEAD^');

    expect(stdout).toContain('Waived by the operator');
    expect(status).toBe(0);
  });

  it('counts no line removed from a skill or an agent definition, so cutting one cannot pay for an addition', () => {
    const before = { '.claude/skills/a/SKILL.md': lines(9), '.claude/agents/a.md': lines(9) };
    const sweep = {
      '.claude/skills/a/SKILL.md': lines(1),
      '.claude/agents/a.md': lines(2),
      'a.sh': lines(2),
    };
    const { status, stdout } = kaizenAfter([before, sweep], 'balance', 'HEAD^');

    expect(stdout).toContain('Balance: added 2, removed 0 outside');
    expect(status).toBe(1);
  });

  it('passes a sweep that removes as much as it adds, and leaves out what a sweep does not count', () => {
    const sweep = {
      [INVENTORY]: lines(9),
      [FRICTION_LOG]: lines(9),
      'docs/adr/a.md': lines(9),
      'docs/dantotsus/a.md': lines(9),
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

describe('kaizen.sh log', () => {
  const ONE_COMMIT = [{ 'README.md': 'repository\n' }];
  const SEEN = ['--where', 'GET /api/upcoming', 'the list carries a count'];

  function onBranch(branch: string): Repository {
    const repository = createRepository(ONE_COMMIT);
    repository.git('switch', '-q', '-c', branch);
    return repository;
  }

  it("appends what was seen and where to the branch's own log, which git tracks from its first line", () => {
    const repository = onBranch('claude/some-feature');

    expect(repository.kaizen(repository.directory, 'log', ...SEEN).status).toBe(0);
    const log = readFileSync(join(repository.directory, FRICTION_LOG), 'utf8');
    expect(log).toMatch(/^# Friction log of claude\/some-feature\n/);
    expect(log).toMatch(
      /^- \[[^\]]+\] `main` the list carries a count \(where: GET \/api\/upcoming\)$/m,
    );
    expect(repository.git('status', '--porcelain', '--untracked-files=no')).toBe(
      ` A ${FRICTION_LOG}\n`,
    );
  });

  it('refuses on main, where no pull request would carry the line, and logs nothing', () => {
    const repository = createRepository(ONE_COMMIT);

    expect(repository.kaizen(repository.directory, 'log', ...SEEN).status).toBe(1);
    expect(repository.git('status', '--porcelain')).toBe('');
  });

  it('refuses a line that does not say where it was seen, and logs nothing', () => {
    const repository = onBranch('claude/some-feature');

    expect(repository.kaizen(repository.directory, 'log', 'the list carries a count').status).toBe(
      1,
    );
    expect(existsSync(join(repository.directory, FRICTION_LOG))).toBe(false);
  });

  it.each([['list'], ['--where', 'here', 'a sentence without the subcommand']])(
    'refuses %s as a subcommand, so a typo never becomes a line',
    (...command) => {
      const repository = onBranch('claude/some-feature');

      expect(repository.kaizen(repository.directory, ...command).status).toBe(1);
      expect(repository.git('status', '--porcelain')).toBe('');
    },
  );

  it("keeps a worktree agent's lines in its own file, so merging its branch back meets no conflict", () => {
    const repository = onBranch('claude/some-feature');
    const worktree = join(repository.directory, 'agent-worktree');
    repository.git('worktree', 'add', '-q', '-b', 'worktree-agent-1', worktree);

    repository.kaizen(repository.directory, 'log', '--where', 'main', 'the main session saw this');
    repository.kaizen(worktree, 'log', '--from', 'agent', '--where', 'wt', 'the agent saw that');
    repository.git('-C', worktree, 'commit', '-q', '-am', 'agent');
    repository.git('commit', '-q', '-am', 'main');
    repository.git('merge', '-q', '--no-edit', 'worktree-agent-1');

    expect(repository.git('show', `HEAD:${FRICTION_LOG}`)).toContain('the main session saw this');
    expect(repository.git('show', 'HEAD:docs/kaizen/worktree-agent-1.md')).toContain(
      '`agent` the agent saw that',
    );
  });
});

describe('the git hooks that log their own refusals', () => {
  it.each(['.husky/commit-msg', '.husky/pre-push'])('%s says where with --where', (hook) => {
    const source = readFileSync(resolve(import.meta.dirname, '..', hook), 'utf8');
    const calls = source
      .split('\n')
      .filter((line) => line.includes('scripts/kaizen.sh log --from'));
    expect(calls.length).toBeGreaterThan(0);
    for (const call of calls) expect(call).toContain('--where');
  });
});
