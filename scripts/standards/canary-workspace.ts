import { execFileSync, spawnSync } from 'node:child_process';
import {
  appendFileSync,
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import type { CanaryEdit } from './canaries.core';

const OUTPUT_LIMIT_BYTES = 64 * 1024 * 1024;
const GIT_IDENTITY = ['-c', 'user.name=gate-canary', '-c', 'user.email=gate-canary@localhost'];

export interface CommandResult {
  readonly exitCode: number;
  readonly output: string;
}

function listCopiedFiles(repositoryRoot: string): readonly string[] {
  return execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    maxBuffer: OUTPUT_LIMIT_BYTES,
  })
    .split('\0')
    .filter((path) => path.length > 0 && existsSync(join(repositoryRoot, path)));
}

function listWorkspaceDirectories(
  repositoryRoot: string,
  files: readonly string[],
): readonly string[] {
  const directories = new Set<string>(['.']);
  for (const file of files) {
    const match = /^((?:apps|infra)\/[^/]+)\/package\.json$/.exec(file);
    if (match?.[1] !== undefined) directories.add(match[1]);
  }
  return [...directories].filter((directory) =>
    existsSync(join(repositoryRoot, directory, 'node_modules')),
  );
}

function copyEntry(source: string, target: string): void {
  mkdirSync(dirname(target), { recursive: true });
  if (lstatSync(source).isSymbolicLink()) {
    symlinkSync(readlinkSync(source), target);
    return;
  }
  cpSync(source, target, { preserveTimestamps: true });
}

function linkInstalledPackages(installed: string, target: string): void {
  mkdirSync(target, { recursive: true });
  for (const entry of readdirSync(installed))
    symlinkSync(join(installed, entry), join(target, entry));
}

function runGit(workspaceRoot: string, argumentsList: readonly string[]): void {
  execFileSync('git', [...GIT_IDENTITY, ...argumentsList], {
    cwd: workspaceRoot,
    stdio: 'ignore',
    maxBuffer: OUTPUT_LIMIT_BYTES,
  });
}

export function runCommand(
  root: string,
  command: readonly string[],
  environment: Readonly<Record<string, string>> = {},
): CommandResult {
  const [program, ...argumentsList] = command;
  if (program === undefined) return { exitCode: 1, output: 'empty command' };
  const result = spawnSync(program, argumentsList, {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: OUTPUT_LIMIT_BYTES,
    env: { ...process.env, ...environment, FORCE_COLOR: '0', NO_COLOR: '1', CI: 'true' },
  });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}${result.error?.message ?? ''}`;
  return { exitCode: result.status ?? 1, output };
}

export class CanaryWorkspace {
  private readonly planted = new Set<string>();

  private constructor(readonly root: string) {}

  static create(repositoryRoot: string): CanaryWorkspace {
    const root = mkdtempSync(join(tmpdir(), 'gate-canaries-'));
    const files = listCopiedFiles(repositoryRoot);
    for (const file of files) copyEntry(join(repositoryRoot, file), join(root, file));
    for (const directory of listWorkspaceDirectories(repositoryRoot, files)) {
      linkInstalledPackages(
        join(repositoryRoot, directory, 'node_modules'),
        join(root, directory, 'node_modules'),
      );
    }
    runGit(root, ['init', '-q', '-b', 'main']);
    appendFileSync(join(root, '.git', 'info', 'exclude'), 'node_modules\n');
    runGit(root, ['add', '-A']);
    runGit(root, ['commit', '-q', '-m', 'canary baseline']);
    return new CanaryWorkspace(root);
  }

  plant(files: Readonly<Record<string, string>>): void {
    for (const [path, content] of Object.entries(files)) {
      const target = join(this.root, path);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, content);
      this.planted.add(target);
    }
  }

  applyEdits(edits: readonly CanaryEdit[]): readonly string[] {
    const problems: string[] = [];
    for (const edit of edits) {
      const target = join(this.root, edit.path);
      if (!existsSync(target)) {
        problems.push(`${edit.path} does not exist`);
        continue;
      }
      const before = readFileSync(target, 'utf8');
      if (!before.includes(edit.find)) {
        problems.push(`${edit.path} no longer contains ${JSON.stringify(edit.find)}`);
        continue;
      }
      writeFileSync(target, before.replace(edit.find, edit.replace));
    }
    return problems;
  }

  stage(): void {
    runGit(this.root, ['add', '-A']);
  }

  run(
    command: readonly string[],
    environment: Readonly<Record<string, string>> = {},
  ): CommandResult {
    return runCommand(this.root, command, environment);
  }

  restore(): void {
    for (const target of this.planted) rmSync(target, { force: true, recursive: true });
    this.planted.clear();
    runGit(this.root, ['reset', '-q', '--hard', 'HEAD']);
    runGit(this.root, ['clean', '-fdq']);
  }

  dispose(): void {
    rmSync(this.root, { recursive: true, force: true });
  }
}
