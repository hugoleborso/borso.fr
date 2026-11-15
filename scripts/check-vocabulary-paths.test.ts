import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const GATE = 'check-vocabulary-paths.sh';
const GLOSSARY_PATH = 'apps/demo/VOCABULARY.md';
const INVARIANTS_PATH = 'apps/demo/api/src/things/INVARIANTS.md';
const TEST_PATH = 'apps/demo/api/src/things/things.test.ts';
const REPOSITORY_GLOSSARY_PATH = 'docs/VOCABULARY.md';

const GLOSSARY = [
  '# Vocabulary of demo',
  '',
  '## Thing',
  '',
  'One thing the demo talks about.',
  '',
  'Lives in: `api/src/things/`',
  '',
  '- Code: `Thing` (`name`).',
  '',
  'Invariants: `api/src/things/INVARIANTS.md`',
  '',
  'Not to be confused with: a widget.',
  '',
  '## Words we do not use',
  '',
  '- **item** for a thing: it is a **thing**.',
].join('\n');

const INVARIANTS = [
  '# Invariants of demo, in `api/src/things`',
  '',
  '## Thing',
  '',
  '- A thing has a name.',
  '',
  'Held by: `api/src/things/things.test.ts` › refuses a thing with no name',
].join('\n');

const REPOSITORY_GLOSSARY = [
  '# Vocabulary of the repository',
  '',
  '## Glossaries',
  '',
  '- [demo](../apps/demo/VOCABULARY.md)',
  '',
  '## Gate',
  '',
  'A check that stops a change.',
  '',
  'Lives in: `scripts/`',
].join('\n');

const TEST_SOURCE = "it('refuses a thing with no name', () => {});\n";

const VALID_TREE: Readonly<Record<string, string>> = {
  [GLOSSARY_PATH]: GLOSSARY,
  [INVARIANTS_PATH]: INVARIANTS,
  [TEST_PATH]: TEST_SOURCE,
  [REPOSITORY_GLOSSARY_PATH]: REPOSITORY_GLOSSARY,
};

const repositories: string[] = [];

function environmentWithoutGit(): NodeJS.ProcessEnv {
  return Object.fromEntries(
    Object.entries(process.env).filter(([name]) => !name.startsWith('GIT_')),
  );
}

function runGate(tree: Readonly<Record<string, string>>): number {
  const directory = mkdtempSync(join(tmpdir(), 'vocabulary-gate-'));
  repositories.push(directory);
  mkdirSync(join(directory, 'scripts'));
  copyFileSync(resolve(import.meta.dirname, GATE), join(directory, 'scripts', GATE));
  for (const [path, content] of Object.entries(tree)) {
    mkdirSync(dirname(join(directory, path)), { recursive: true });
    writeFileSync(join(directory, path), `${content}\n`);
  }
  const environment = environmentWithoutGit();
  execFileSync('git', ['init', '-q'], { cwd: directory, env: environment });
  try {
    execFileSync(join(directory, 'scripts', GATE), { stdio: 'pipe', env: environment });
    return 0;
  } catch (error) {
    if (error instanceof Error && 'status' in error && typeof error.status === 'number') {
      return error.status;
    }
    throw error;
  }
}

function withFile(path: string, content: string): Readonly<Record<string, string>> {
  return { ...VALID_TREE, [path]: content };
}

afterEach(() => {
  for (const directory of repositories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('check-vocabulary-paths.sh', () => {
  it('passes a glossary whose term reaches its invariants and whose invariant names a real test', () => {
    expect(runGate(VALID_TREE)).toBe(0);
  });

  it('refuses a glossary carrying a Held by line', () => {
    const glossary = `${GLOSSARY}\n\nHeld by: \`api/src/things/things.test.ts\` › refuses a thing with no name`;

    expect(runGate(withFile(GLOSSARY_PATH, glossary))).toBe(1);
  });

  it('refuses a rule bullet in a glossary term, and keeps the Code bullet and the words list', () => {
    const glossary = GLOSSARY.replace('- Code:', '- A thing has a name.\n- Code:');

    expect(runGate(withFile(GLOSSARY_PATH, glossary))).toBe(1);
  });

  it('refuses a term whose invariants file has no section for it', () => {
    const invariants = INVARIANTS.replace('## Thing', '## Things');

    expect(runGate(withFile(INVARIANTS_PATH, invariants))).toBe(1);
  });

  it('refuses a term whose invariants file is not there', () => {
    const glossary = GLOSSARY.replace(
      'Invariants: `api/src/things/INVARIANTS.md`',
      'Invariants: `api/src/widgets/INVARIANTS.md`',
    );

    expect(runGate(withFile(GLOSSARY_PATH, glossary))).toBe(1);
  });

  it('refuses an invariants section no term points at', () => {
    const glossary = GLOSSARY.replace('Invariants: `api/src/things/INVARIANTS.md`\n\n', '');

    expect(runGate(withFile(GLOSSARY_PATH, glossary))).toBe(1);
  });

  it('refuses a Held by line naming a test file that is not there', () => {
    const invariants = INVARIANTS.replace('things.test.ts', 'gone.test.ts');

    expect(runGate(withFile(INVARIANTS_PATH, invariants))).toBe(1);
  });

  it('refuses a Held by line naming a title the test file does not have', () => {
    const invariants = INVARIANTS.replace('with no name', 'with two names');

    expect(runGate(withFile(INVARIANTS_PATH, invariants))).toBe(1);
  });

  it('refuses a Held by line that is not a test file and a title', () => {
    const invariants = `${INVARIANTS}\nHeld by: the things tests`;

    expect(runGate(withFile(INVARIANTS_PATH, invariants))).toBe(1);
  });

  it('refuses an indented Held by line', () => {
    const invariants = INVARIANTS.replace('Held by:', '  Held by:');

    expect(runGate(withFile(INVARIANTS_PATH, invariants))).toBe(1);
  });

  it('refuses an invariant sourced from the comment above', () => {
    const invariants = INVARIANTS.replace('- A thing', '- As the comment above says, a thing');

    expect(runGate(withFile(INVARIANTS_PATH, invariants))).toBe(1);
  });

  it('refuses an invariant sourced from a file header', () => {
    const invariants = INVARIANTS.replace('- A thing', '- The file header says a thing');

    expect(runGate(withFile(INVARIANTS_PATH, invariants))).toBe(1);
  });

  it('refuses an application term living in a folder that is not there', () => {
    const glossary = GLOSSARY.replace('Lives in: `api/src/things/`', 'Lives in: `api/src/gone/`');

    expect(runGate(withFile(GLOSSARY_PATH, glossary))).toBe(1);
  });

  it('refuses a repository term living in a path that is not there', () => {
    const glossary = REPOSITORY_GLOSSARY.replace('Lives in: `scripts/`', 'Lives in: `gone/`');

    expect(runGate(withFile(REPOSITORY_GLOSSARY_PATH, glossary))).toBe(1);
  });

  it('refuses a repository glossary that does not list an application glossary', () => {
    const glossary = REPOSITORY_GLOSSARY.replace('- [demo](../apps/demo/VOCABULARY.md)\n', '');

    expect(runGate(withFile(REPOSITORY_GLOSSARY_PATH, glossary))).toBe(1);
  });
});
