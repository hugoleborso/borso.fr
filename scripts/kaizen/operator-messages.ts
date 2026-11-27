#!/usr/bin/env tsx
import { globSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import {
  listListedPages,
  listLoggedLines,
  readSavedPage,
  selectOperatorMessages,
} from './operator-messages.core';

const sessionId = process.env.CLAUDE_CODE_SESSION_ID;
if (sessionId === undefined) {
  process.stderr.write(
    "operator-messages: CLAUDE_CODE_SESSION_ID is not set, so this session's transcript cannot be found.\n",
  );
  process.exit(1);
}

const projects = join(homedir(), '.claude', 'projects');
const transcripts = globSync([`*/${sessionId}.jsonl`, `*/${sessionId}/**/*.jsonl`], {
  cwd: projects,
});
const pages = transcripts.flatMap((transcript) =>
  listListedPages(readFileSync(join(projects, transcript), 'utf8').split('\n').filter(Boolean)),
);

const listed = pages.map((page) =>
  readSavedPage('saved' in page ? page.saved : readFileSync(page.spilledTo, 'utf8')),
);
const operatorLines = listed
  .flatMap(selectOperatorMessages)
  .toSorted((first, second) => first.at.localeCompare(second.at))
  .map(
    (message) =>
      `- [${message.at}]${message.isAnswer ? ' (answer)' : ''} ${message.text.replaceAll('\n', ' ')}`,
  );
const kaizenLines = listed
  .flatMap(listLoggedLines)
  .toSorted()
  .map((line) => `- ${line}`);
const inline = pages.filter((page) => 'saved' in page).length;
process.stdout.write(
  [
    `[operator-messages] ${pages.length} list_events page(s) read, ${inline} of them inline`,
    'Typed by the operator:',
    ...new Set(operatorLines),
    'Friction the listed sessions logged, archived or not:',
    ...new Set(kaizenLines),
    '',
  ].join('\n'),
);
