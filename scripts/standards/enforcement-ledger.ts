import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildLedgerInput } from './ledger-input';
import { renderLedger, selectLedgerProblems } from './ledger.core';

const LEDGER_PATH = join(process.cwd(), 'docs', 'standards', 'enforcement-ledger.md');

async function main(): Promise<void> {
  const isCheck = process.argv.includes('--check');
  const input = await buildLedgerInput();
  const rendered = renderLedger(input);
  const problems = selectLedgerProblems(input);

  for (const problem of problems) console.error(`  ${problem.standard}: ${problem.message}`);

  if (isCheck) {
    writeFileSync(LEDGER_PATH, rendered);
    if (problems.length > 0) {
      console.error(
        `${String(problems.length)} standard(s) claim enforcement this checkout does not have.`,
      );
      process.exitCode = 1;
      return;
    }
    console.log('Every standard names a mechanism that exists and runs.');
    return;
  }

  writeFileSync(LEDGER_PATH, rendered);
  console.log(`Wrote ${LEDGER_PATH} (${String(problems.length)} problem(s)).`);
  if (problems.length > 0) process.exitCode = 1;
}

await main();
