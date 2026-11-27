// @FollowsBlueprint utils-pure-module
import { type Check, type HookInput, type HookWorld, PASS, refuse } from '../check.core.ts';
import { isCommentOnlyEdit } from '../../dependencies/comment-only-change.core.ts';
import { readHeadBranch, isRunningPullRequestCreate, stripHeredocs } from './gh-pr-create.core.ts';
import { isTestFile } from '../../test-file.core.ts';

const API_FILE = /^apps\/[^/]+\/api\//u;
const SITE_FILE = /^apps\/[^/]+\/site\//u;
const MARKDOWN_FILE = /\.md$/u;
const TECHNICAL_REPORT =
  /^docs\/features\/[^/]+\/[^/]+\/validation\/technical-validation-[^/]+\.md$/u;
const VISUAL_REPORT = /^docs\/features\/[^/]+\/[^/]+\/validation\/visual-validation-[^/]+\.md$/u;
const LISTED_FILES = 3;

function readString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function readHeadToCompare(input: HookInput): string | null {
  const head = readString(input.tool_input?.['head']);
  if (head !== '') return head;
  const command = readString(input.tool_input?.['command']);
  if (!isRunningPullRequestCreate(command)) return null;
  return readHeadBranch(stripHeredocs(command));
}

function resolveComparedHead(head: string, world: HookWorld): string {
  if (head === '') return 'HEAD';
  world.run('git', ['fetch', '-q', 'origin', 'main', head]);
  const verified = world.run('git', ['rev-parse', '-q', '--verify', `origin/${head}`]);
  return verified.status === 0 ? `origin/${head}` : 'HEAD';
}

function readFileAt(revision: string, path: string, world: HookWorld): string | null {
  const shown = world.run('git', ['show', `${revision}:${path}`]);
  return shown.status === 0 ? shown.stdout : null;
}

function changesCode(base: string, head: string, world: HookWorld): (path: string) => boolean {
  return (path) =>
    !isCommentOnlyEdit(path, readFileAt(base, path, world), readFileAt(head, path, world));
}

function composeFirstFiles(files: readonly string[]): string {
  return files
    .slice(0, LISTED_FILES)
    .map((file) => `${file} `)
    .join('');
}

export const apiChangeNeedsValidation: Check = {
  name: 'api-change-needs-validation',
  tools: /^(Bash|mcp__github__create_pull_request)$/u,
  run(input, world) {
    const head = readHeadToCompare(input);
    if (head === null) return PASS;
    const comparedHead = resolveComparedHead(head, world);
    const { stdout } = world.run('git', ['diff', '--name-only', `origin/main...${comparedHead}`]);
    const changed = stdout.split('\n');
    const base = world.run('git', ['merge-base', 'origin/main', comparedHead]).stdout.trim();
    const isCodeChange = changesCode(base, comparedHead, world);
    const apiFiles = changed.filter((path) => API_FILE.test(path) && isCodeChange(path));
    const siteFiles = changed.filter(
      (path) =>
        SITE_FILE.test(path) &&
        !isTestFile(path) &&
        !MARKDOWN_FILE.test(path) &&
        isCodeChange(path),
    );
    if (apiFiles.length > 0 && !changed.some((path) => TECHNICAL_REPORT.test(path))) {
      return refuse(
        'api-validation',
        'opened a pull request changing an API without a technical-validation report',
        [
          `this branch changes ${String(apiFiles.length)} file(s) under apps/*/api/ and commits no technical-validation report.`,
          'Run /technical-validation, commit its report under docs/features/<app>/<slug>/validation/, then open the pull request.',
          'Run it on finished work. A branch gets two rounds, and a round run on unfinished code to get past this gate is spent: PR #298 merged on a FAIL verdict that way.',
          'If the work needs its preview before it is finished, ask the operator.',
          `First files: ${composeFirstFiles(apiFiles)}`,
        ],
      );
    }
    if (siteFiles.length === 0 || changed.some((path) => VISUAL_REPORT.test(path))) return PASS;
    return refuse(
      'visual-validation',
      'opened a pull request changing a front end without a visual-validation report',
      [
        `this branch changes ${String(siteFiles.length)} front-end file(s) under apps/*/site/ and commits no visual-validation report.`,
        'Run /visual-validation once the work is finished, commit its report under docs/features/<app>/<slug>/validation/, then open the pull request.',
        `First files: ${composeFirstFiles(siteFiles)}`,
      ],
    );
  },
};
