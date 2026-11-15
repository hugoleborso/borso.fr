import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const GATE = 'check-docs-are-english.sh';
const FRENCH_SENTENCE =
  'La décision est de garder la PWA pour les propositions, et nous ne prenons pas de licence dans cette version.';
const ENGLISH_SENTENCE =
  'The decision keeps the PWA for proposals, and the card shows the « Décider » tab with « la carte » quoted.';
const FRENCH_PROSE = `# ADR\n\n${Array.from({ length: 6 }, () => FRENCH_SENTENCE).join('\n')}\n`;
const ENGLISH_PROSE = `# ADR\n\n${Array.from({ length: 6 }, () => ENGLISH_SENTENCE).join('\n')}\n`;
const FRENCH_ADR = 'docs/adr/2099-01-01T0000-a-record.md';
const FRENCH_SPEC = 'docs/features/talos/a-feature/spec/spec.md';

const repositories: string[] = [];

function git(directory: string, ...args: string[]): void {
  execFileSync('git', args, { cwd: directory, stdio: 'pipe' });
}

function makeRepository(files: Record<string, string>): string {
  const directory = mkdtempSync(join(tmpdir(), 'docs-are-english-'));
  repositories.push(directory);
  mkdirSync(join(directory, 'scripts'));
  copyFileSync(resolve(import.meta.dirname, GATE), join(directory, 'scripts', GATE));
  git(directory, 'init', '-q');
  git(directory, 'config', 'user.email', 'gate@example.invalid');
  git(directory, 'config', 'user.name', 'gate');
  for (const [path, body] of Object.entries(files)) {
    mkdirSync(join(directory, dirname(path)), { recursive: true });
    writeFileSync(join(directory, path), body);
  }
  return directory;
}

function runGate(directory: string, ...paths: string[]): number {
  try {
    execFileSync(join(directory, 'scripts', GATE), paths, { cwd: directory, stdio: 'pipe' });
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

describe('check-docs-are-english.sh', () => {
  it('refuses a French ADR that main does not hold', () => {
    const directory = makeRepository({ [FRENCH_ADR]: FRENCH_PROSE });

    expect(runGate(directory, FRENCH_ADR)).toBe(1);
  });

  it('refuses a French spec in a nested folder of the spec', () => {
    const nested = 'docs/features/talos/a-feature/spec/mockups/notes.md';
    const directory = makeRepository({ [nested]: FRENCH_PROSE });

    expect(runGate(directory, nested)).toBe(1);
  });

  it('passes an English ADR that quotes French product strings', () => {
    const directory = makeRepository({ [FRENCH_ADR]: ENGLISH_PROSE });

    expect(runGate(directory, FRENCH_ADR)).toBe(0);
  });

  it('passes a French spec already on main', () => {
    const directory = makeRepository({ [FRENCH_SPEC]: FRENCH_PROSE });
    git(directory, 'add', '.');
    git(directory, 'commit', '-q', '-m', 'spec');
    git(directory, 'update-ref', 'refs/remotes/origin/main', 'HEAD');

    expect(runGate(directory, FRENCH_SPEC)).toBe(0);
  });

  it('ignores a French file outside ADRs, specs and plans', () => {
    const kaizen = 'docs/features/talos/a-feature/kaizen.md';
    const directory = makeRepository({ [kaizen]: FRENCH_PROSE });

    expect(runGate(directory, kaizen)).toBe(0);
  });

  it('reads the staged copy, not the working tree', () => {
    const directory = makeRepository({ [FRENCH_ADR]: FRENCH_PROSE });
    git(directory, 'add', FRENCH_ADR);
    writeFileSync(join(directory, FRENCH_ADR), ENGLISH_PROSE);

    expect(runGate(directory, FRENCH_ADR)).toBe(1);
  });

  it('checks every tracked held file when given none', () => {
    const directory = makeRepository({ [FRENCH_ADR]: FRENCH_PROSE });
    git(directory, 'add', FRENCH_ADR);

    expect(runGate(directory)).toBe(1);
  });
});
