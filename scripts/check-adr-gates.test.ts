import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const GATES = ['check-adr-numbers-resolve.sh', 'check-adr-criteria.sh'] as const;
const CRITERIA_SECTION = [
  '## Criteria',
  '',
  '| Criterion | Raised by |',
  '| --- | --- |',
  '| Changes the app | operator |',
  '',
  '## Decision',
  '',
  'We do it.',
].join('\n');

const repositories: string[] = [];

type Gate = (typeof GATES)[number];

function runGate(gate: Gate, records: Record<string, string>): number {
  const directory = mkdtempSync(join(tmpdir(), 'adr-gates-'));
  repositories.push(directory);
  mkdirSync(join(directory, 'scripts'));
  mkdirSync(join(directory, 'docs/adr'), { recursive: true });
  for (const each of GATES) {
    copyFileSync(resolve(import.meta.dirname, each), join(directory, 'scripts', each));
  }
  const rows = Object.keys(records).map((filename) => `| [${filename}](./${filename}) |`);
  writeFileSync(join(directory, 'docs/adr/README.md'), `# ADRs\n\n${rows.join('\n')}\n`);
  for (const [filename, body] of Object.entries(records)) {
    writeFileSync(join(directory, 'docs/adr', filename), body);
  }
  try {
    execFileSync(join(directory, 'scripts', gate), { stdio: 'pipe' });
    return 0;
  } catch (error) {
    if (error instanceof Error && 'status' in error && typeof error.status === 'number') {
      return error.status;
    }
    throw error;
  }
}

afterEach(() => {
  for (const directory of repositories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('check-adr-numbers-resolve.sh', () => {
  it('passes a record whose filename, heading and index agree', () => {
    const records = { '2026-11-11T1318-wide-events.md': '# ADR-2026-11-11T1318: Wide events\n' };

    expect(runGate('check-adr-numbers-resolve.sh', records)).toBe(0);
  });

  it('refuses a heading that names another minute', () => {
    const records = { '2026-11-11T1318-wide-events.md': '# ADR-2026-11-11T1319: Wide events\n' };

    expect(runGate('check-adr-numbers-resolve.sh', records)).toBe(1);
  });

  it('refuses a record still named by a four-digit number', () => {
    const records = { '0007-oxlint.md': '# ADR-0007: Oxlint\n' };

    expect(runGate('check-adr-numbers-resolve.sh', records)).toBe(1);
  });
});

describe('check-adr-criteria.sh', () => {
  it('passes a recent record whose operator named a criterion before the decision', () => {
    const records = {
      '2026-11-11T1318-wide-events.md': `# ADR-2026-11-11T1318: Wide events\n\n${CRITERIA_SECTION}\n`,
    };

    expect(runGate('check-adr-criteria.sh', records)).toBe(0);
  });

  it('refuses a recent record with no criteria', () => {
    const records = {
      '2026-11-11T1318-wide-events.md': '# ADR-2026-11-11T1318: Wide events\n\n## Decision\n',
    };

    expect(runGate('check-adr-criteria.sh', records)).toBe(1);
  });

  it('leaves a record older than the rule alone', () => {
    const records = {
      '2026-10-01T0900-old.md': '# ADR-2026-10-01T0900: Old\n\n## Decision\n',
    };

    expect(runGate('check-adr-criteria.sh', records)).toBe(0);
  });
});
