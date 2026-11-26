// @FollowsBlueprint utils-pure-module
import { posix } from 'node:path';
import {
  type Check,
  type HookInput,
  type HookWorld,
  PASS,
  refuse,
  type Verdict,
} from '../check.core.ts';
import { stripStringBodies } from '../shell-command.core.ts';

const RULE = 'subagent-no-staging';

const HELP_INVOCATION = /git\s+(-C\s+\S+\s+)?(add|mv|rm|commit)\s+(-h|--help)(\s*($|[;&|)]))/gu;
const STAGING = /(^|[;&|(]|\bthen\b|\bdo\b)\s*git\s+(-C\s+\S+\s+)?(add|mv|rm|commit)(\s|$)/u;
const CHANGE_DIRECTORY = /(^|[;&|(]|\bthen\b|\bdo\b)\s*cd\s+([^\s;&|)]+)/gu;
const EXPLICIT_DIRECTORY = /.*git\s+-C\s+(\S+)/u;

function readCommand(input: HookInput): string {
  const command = input.tool_input?.['command'];
  return typeof command === 'string' ? command : '';
}

function findStaging(lines: readonly string[]): string | null {
  for (const line of lines) {
    const match = STAGING.exec(line);
    if (match !== null) return match[0];
  }
  return null;
}

function joinDirectory(base: string, directory: string): string {
  return directory.startsWith('/') ? directory : `${base}/${directory}`;
}

function selectTarget(commandToRun: string, staging: string, start: string): string {
  const beforeStaging = commandToRun.slice(0, commandToRun.indexOf(staging)) + staging;
  const target = beforeStaging
    .split('\n')
    .flatMap((line) =>
      [...line.matchAll(CHANGE_DIRECTORY)].map((match) => match[0].replace(/.*cd\s+/u, '')),
    )
    .reduce(joinDirectory, start);
  return EXPLICIT_DIRECTORY.exec(staging)?.[1] ?? target;
}

function findExistingAncestor(world: HookWorld, directory: string): string {
  let target = directory;
  while (target !== '/' && world.run('test', ['-d', target]).status !== 0) {
    target = posix.dirname(target);
  }
  return target;
}

function readGitPath(world: HookWorld, directory: string, flag: string): string {
  const result = world.run('git', ['-C', directory, 'rev-parse', '--path-format=absolute', flag]);
  return result.status === 0 ? result.stdout.trim() : '';
}

export const subagentNoStaging: Check = {
  name: RULE,
  tools: /^Bash$/u,
  run(input, world): Verdict {
    if (!input.agent_id) return PASS;
    const command = readCommand(input);
    if (command === '') return PASS;
    const lines = stripStringBodies(command)
      .split('\n')
      .map((line) => line.replace(HELP_INVOCATION, 'true$5'));
    const staging = findStaging(lines);
    if (staging === null) return PASS;
    const start = input.cwd || world.projectDirectory;
    const target = posix.resolve(start, selectTarget(lines.join('\n'), staging, start));
    const sharedIndexDirectory = readGitPath(world, world.projectDirectory, '--git-common-dir');
    const ownGitDirectory = readGitPath(world, findExistingAncestor(world, target), '--git-dir');
    if (ownGitDirectory === '' || ownGitDirectory !== sharedIndexDirectory) return PASS;
    return refuse(RULE, 'a subagent ran a git command that writes the shared index', [
      "A subagent shares this checkout's index with every other agent, and the main session commits.",
      'Change the working tree only, and name the paths in your report:',
      '  git mv a b  ->  mv a b       git rm a  ->  rm a       git add, git commit  ->  nothing',
    ]);
  },
};
