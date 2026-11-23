#!/usr/bin/env tsx
import { readFileSync } from 'node:fs';
import { selectOperatorMessages } from './operator-messages.core';

const pages = process.argv.slice(2);
if (pages.length === 0) {
  process.stderr.write(
    'usage: pnpm exec tsx scripts/kaizen/operator-messages.ts <events-page.json>...\n' +
      'Each file is one page the remote-session event listing returned for kinds ["user"] (its JSON, or the saved tool result wrapping it in {"ccr": ...}).\n',
  );
  process.exit(1);
}

const seen = new Set<string>();
for (const path of pages) {
  const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
  const page =
    typeof parsed === 'object' && parsed !== null && 'ccr' in parsed ? parsed.ccr : parsed;
  for (const message of selectOperatorMessages(page)) {
    const key = `${message.at}|${message.text}`;
    if (seen.has(key)) continue;
    seen.add(key);
    process.stdout.write(
      `- [${message.at}]${message.isAnswer ? ' (answer)' : ''} ${message.text.replaceAll('\n', ' ')}\n`,
    );
  }
}
