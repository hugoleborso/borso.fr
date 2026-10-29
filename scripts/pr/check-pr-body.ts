import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { LIMITS, renderBody, validateBody } from './pr-body.core';

const args = process.argv.slice(2);
const RENDER_FLAG = '--render';
const PULL_REQUEST_FLAG = '--pr';
const REPOSITORY = 'hugoleborso/borso.fr';
const shouldRender = args.includes(RENDER_FLAG);
const FLAG_PREFIX = '--';
const pullRequestIndex = args.indexOf(PULL_REQUEST_FLAG);
const pullRequestNumber = pullRequestIndex === -1 ? undefined : args[pullRequestIndex + 1];
const pullRequestNumberIndex = pullRequestIndex === -1 ? -1 : pullRequestIndex + 1;
const positional = args.filter(
  (argument, index) => !argument.startsWith(FLAG_PREFIX) && index !== pullRequestNumberIndex,
);
const path = pullRequestIndex === -1 ? positional[0] : undefined;
const unknownFlag = args.find(
  (argument) =>
    argument.startsWith(FLAG_PREFIX) && argument !== RENDER_FLAG && argument !== PULL_REQUEST_FLAG,
);
const isPullRequestNumber = pullRequestNumber !== undefined && /^\d+$/.test(pullRequestNumber);

if (
  (path === undefined && !isPullRequestNumber) ||
  unknownFlag !== undefined ||
  (pullRequestIndex !== -1 && positional.length > 0)
) {
  process.stderr.write(
    [
      'usage: pnpm exec tsx scripts/pr/check-pr-body.ts <draft.md> [--render]',
      '       pnpm exec tsx scripts/pr/check-pr-body.ts --pr <number>',
      '',
      'Validates a PR body draft against the limits, then --render prints the',
      'body to post (the title heading and the attribution footer removed).',
      '--pr reads the title and body of an open pull request through `gh api`,',
      'so a posted body is checked as GitHub kept it, without retyping it.',
      '',
      `title ${String(LIMITS.title)}, description ${String(LIMITS.description)}, flow nodes ${String(LIMITS.flowNodes)}`,
      `decisions ${String(LIMITS.decisionRows)} rows, cells ${String(LIMITS.decisionShortCell)} then ${String(LIMITS.decisionLongCell)}`,
      `before merge ${String(LIMITS.beforeMerge)}, validation ${String(LIMITS.evidenceItems)} items of ${String(LIMITS.evidenceTitle)} and ${String(LIMITS.evidenceBody)}`,
      `notable facts ${String(LIMITS.notableFact)}`,
      '',
      'Only letters and digits count. Punctuation, spaces, markup and link targets do not.',
      '',
    ].join('\n'),
  );
  process.exit(2);
}

function readPullRequestAsDraft(number: string): string {
  const pullRequest: unknown = JSON.parse(
    execFileSync('gh', ['api', `repos/${REPOSITORY}/pulls/${number}`], { encoding: 'utf8' }),
  );
  const title =
    typeof pullRequest === 'object' && pullRequest !== null && 'title' in pullRequest
      ? String(pullRequest.title)
      : '';
  const body =
    typeof pullRequest === 'object' && pullRequest !== null && 'body' in pullRequest
      ? String(pullRequest.body ?? '')
      : '';
  return `# ${title}\n\n${body}`;
}

const subject = path ?? `pull request #${String(pullRequestNumber)}`;
const source =
  path === undefined
    ? readPullRequestAsDraft(String(pullRequestNumber))
    : readFileSync(path, 'utf8');
const violations = validateBody(source);

if (violations.length > 0) {
  for (const violation of violations) {
    process.stderr.write(`[pr-body] ${violation.where}: ${violation.problem}\n`);
  }
  process.stderr.write(`[pr-body] ${String(violations.length)} violation(s) in ${subject}\n`);
  process.exit(1);
}

if (shouldRender) process.stdout.write(`${renderBody(source)}\n`);
else process.stderr.write(`[pr-body] ${subject} is within every limit\n`);
