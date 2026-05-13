import { readFileSync } from 'node:fs';
import { aggregateRun, type JournalEvent, parseEvent } from '../src/journal.utils';

const USAGE = 'Usage: pnpm tech-lead:metrics <runs/<run-id>/journal.md.jsonl>';
const EXIT_USAGE = 64;

function main(): void {
  const journalPath = process.argv[2];
  if (journalPath === undefined) {
    process.stderr.write(`${USAGE}\n`);
    process.exit(EXIT_USAGE);
  }
  const content = readFileSync(journalPath, 'utf8');
  const events: JournalEvent[] = [];
  for (const line of content.split('\n')) {
    const parsed = parseEvent(line);
    if (parsed !== null) events.push(parsed);
  }
  const metrics = aggregateRun(events);
  process.stdout.write(`${JSON.stringify(metrics, null, 2)}\n`);
}

main();
