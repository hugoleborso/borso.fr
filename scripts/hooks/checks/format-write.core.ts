// @FollowsBlueprint utils-pure-module
import { basename, dirname } from 'node:path';
import { type Check, type HookInput, type HookWorld, PASS } from '../check.core.ts';

const FORMATTABLE_FILE = /\.(ts|tsx|js|jsx|mjs|cjs|json|jsonc|css|html|yml|yaml)$/u;
const TWO_PATHS = /^([^\n]+)\n([^\n]+)\n$/u;

function readFilePath(input: HookInput): string {
  const filePath = input.tool_input?.['file_path'];
  return typeof filePath === 'string' ? filePath : '';
}

export function isInsideProject(file: string, world: HookWorld): boolean {
  const resolved = world.run('realpath', ['-e', '--', world.projectDirectory, dirname(file)]);
  const lines = TWO_PATHS.exec(resolved.stdout);
  if (resolved.status !== 0 || lines === null) return false;
  const [, projectRoot, fileDirectory] = lines;
  return `${fileDirectory}/${basename(file)}`.startsWith(`${projectRoot}/`);
}

function isExecutable(path: string, world: HookWorld): boolean {
  return world.run('test', ['-x', path]).status === 0;
}

function format(file: string, world: HookWorld): void {
  const oxfmt = `${world.projectDirectory}/node_modules/.bin/oxfmt`;
  const prettier = `${world.projectDirectory}/node_modules/.bin/prettier`;
  if (isExecutable(oxfmt, world)) {
    world.run(oxfmt, [file]);
  } else if (isExecutable(prettier, world)) {
    world.run(prettier, ['--write', '--ignore-unknown', '--cache', file]);
  }
}

export const formatWrite: Check = {
  name: 'format-write',
  tools: /^(Edit|Write|MultiEdit)$/u,
  run: (input, world) => {
    const file = readFilePath(input);
    if (!FORMATTABLE_FILE.test(file)) return PASS;
    const before = world.readText(file);
    if (before === null || !isInsideProject(file, world)) return PASS;
    format(file, world);
    if (world.readText(file) === before) return PASS;
    return {
      kind: 'context',
      text: `[format-write] The formatter rewrote ${file}. Read it again before an exact-text replace.`,
    };
  },
};
