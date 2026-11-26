// @FollowsBlueprint utils-pure-module
import { basename, dirname } from 'node:path';
import { type Check, type HookInput, type HookWorld, PASS } from '../check.core.ts';

const LINTABLE_FILE = /\.(ts|tsx|js|jsx|mjs|cjs)$/u;
const TWO_PATHS = /^([^\n]+)\n([^\n]+)\n$/u;
const REPORT_LINE = /^[^ ][^\n]*:[0-9]+:[0-9]+: /u;
const REPORTED_LINE_LIMIT = 10;
const OXLINT_FOUND_PROBLEMS = 1;
const SOURCE_CONFIG = '.oxlintrc.json';
const WRITE_CONFIG = '.oxlintrc.write.json';

interface ProjectFile {
  readonly root: string;
  readonly path: string;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readFilePath(input: HookInput): string {
  const filePath = input.tool_input?.['file_path'];
  return typeof filePath === 'string' ? filePath : '';
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export function deriveWriteConfig(sourceConfig: string): string | null {
  const config = parseJson(sourceConfig);
  if (!isRecord(config)) return null;
  const options = config['options'] ?? {};
  if (!isRecord(options)) return null;
  const writeOptions = { ...options, typeAware: false, reportUnusedDisableDirectives: 'off' };
  return `${JSON.stringify({ ...config, options: writeOptions }, null, 2)}\n`;
}

export function resolveProjectFile(file: string, world: HookWorld): ProjectFile | null {
  const resolved = world.run('realpath', ['-e', '--', world.projectDirectory, dirname(file)]);
  const { status, stdout } = resolved;
  if (status !== 0 || !TWO_PATHS.test(stdout)) return null;
  const root = stdout.slice(0, stdout.indexOf('\n'));
  const fileDirectory = stdout.slice(root.length + 1, -1);
  const path = `${fileDirectory}/${basename(file)}`;
  const isWorktree = path.startsWith(`${root}/.claude/worktrees/`);
  return !isWorktree && path.startsWith(`${root}/`) ? { root, path } : null;
}

function isWriteConfigStale(root: string, world: HookWorld): boolean {
  const writeConfig = `${root}/${WRITE_CONFIG}`;
  const test = ['!', '-f', writeConfig, '-o', `${root}/${SOURCE_CONFIG}`, '-nt', writeConfig];
  return world.run('test', test).status === 0;
}

function hasWrittenConfigFile(root: string, content: string, world: HookWorld): boolean {
  const staging = world.run('mktemp', [`${root}/.oxlintrc.write.XXXXXX`]);
  if (staging.status !== 0) return false;
  const stagingPath = staging.stdout.trim();
  if (world.run('tee', [stagingPath], content).status !== 0) {
    world.run('rm', ['-f', stagingPath]);
    return false;
  }
  world.run('mv', ['-f', stagingPath, `${root}/${WRITE_CONFIG}`]);
  return true;
}

function isWriteConfigReady(root: string, sourceConfig: string, world: HookWorld): boolean {
  if (!isWriteConfigStale(root, world)) return true;
  const content = deriveWriteConfig(sourceConfig);
  return content !== null && hasWrittenConfigFile(root, content, world);
}

export function selectReportLines(report: string): string {
  return report
    .split('\n')
    .filter((line) => REPORT_LINE.test(line))
    .slice(0, REPORTED_LINE_LIMIT)
    .join('\n');
}

function lint({ root, path }: ProjectFile, world: HookWorld): string {
  const relativePath = path.slice(root.length + 1);
  const oxlint = `${root}/node_modules/.bin/oxlint`;
  const args = ['-c', WRITE_CONFIG, '--quiet', '--format=unix', relativePath];
  const result = world.run(oxlint, args);
  return result.status === OXLINT_FOUND_PROBLEMS ? selectReportLines(result.stdout) : '';
}

function lintProjectFile(file: string, world: HookWorld): string {
  const projectFile = resolveProjectFile(file, world);
  if (projectFile === null) return '';
  const { root } = projectFile;
  const sourceConfig = world.readText(`${root}/${SOURCE_CONFIG}`);
  const hasOxlint = world.run('test', ['-x', `${root}/node_modules/.bin/oxlint`]).status === 0;
  if (!hasOxlint || sourceConfig === null) return '';
  if (!isWriteConfigReady(root, sourceConfig, world)) return '';
  return lint(projectFile, world);
}

export const lintWrite: Check = {
  name: 'lint-write',
  tools: /^(Edit|Write|MultiEdit)$/u,
  run: (input, world) => {
    const file = readFilePath(input);
    if (!LINTABLE_FILE.test(file) || world.readText(file) === null) return PASS;
    const report = lintProjectFile(file, world);
    if (report === '') return PASS;
    return {
      kind: 'context',
      text: `[lint] The file just written breaks a rule the commit gate enforces. Each message names the lesson behind it; fix the shape now rather than build on it:

${report}`,
    };
  },
};
