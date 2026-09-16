import { readFileSync } from 'node:fs';
import { LIMITS, renderBody, validateBody } from './pr-body.core';

const args = process.argv.slice(2);
const RENDER_FLAG = '--render';
const shouldRender = args.includes(RENDER_FLAG);
const path = args.find((argument) => argument !== RENDER_FLAG);

if (path === undefined) {
  process.stderr.write(
    [
      'usage: pnpm exec tsx scripts/pr/check-pr-body.ts <draft.md> [--render]',
      '',
      'Validates a PR body draft against the limits, then --render prints the',
      'body to post (the title heading and the attribution footer removed).',
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

const source = readFileSync(path, 'utf8');
const violations = validateBody(source);

if (violations.length > 0) {
  for (const violation of violations) {
    process.stderr.write(`[pr-body] ${violation.where}: ${violation.problem}\n`);
  }
  process.stderr.write(`[pr-body] ${String(violations.length)} violation(s) in ${path}\n`);
  process.exit(1);
}

if (shouldRender) process.stdout.write(`${renderBody(source)}\n`);
else process.stderr.write(`[pr-body] ${path} is within every limit\n`);
