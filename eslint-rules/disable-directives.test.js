import { execFileSync } from 'node:child_process';
import { rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const REPOSITORY_ROOT = join(import.meta.dirname, '..');
const OXLINT = join(REPOSITORY_ROOT, 'node_modules', '.bin', 'oxlint');
const PLANTED_PREFIX = 'zz-disable-directive';

const CASES = [
  {
    rule: 'borso/no-api-declaration-repeated-in-site',
    code: 'borso(no-api-declaration-repeated-in-site)',
    directory: 'apps/banana-rush/site/src/lib',
    extension: 'ts',
    reason: 'a reason a reviewer can check',
    directiveLine: 0,
    lines: ['export const JOIN_CODE_LENGTH = 4;'],
  },
  {
    rule: 'borso/no-api-import-in-site',
    code: 'borso(no-api-import-in-site)',
    directory: 'apps/banana-rush/site/src/lib',
    extension: 'ts',
    reason: 'a reason a reviewer can check',
    directiveLine: 0,
    lines: [
      "import { normalizeJoinCode } from '@api/games/join-code.utils';",
      'export const normalizedProbe = normalizeJoinCode;',
    ],
  },
  {
    rule: 'borso/no-use-effect',
    code: 'borso(no-use-effect)',
    directory: 'apps/pragma/site/src/components/organisms',
    extension: 'tsx',
    reason: 'attaches Leaflet to the DOM node',
    directiveLine: 2,
    lines: [
      "import { useEffect } from 'react';",
      'export function MapProbe({ attachMap }: { readonly attachMap: () => void }) {',
      '  useEffect(() => attachMap(), [attachMap]);',
      '  return null;',
      '}',
    ],
  },
];

function plantedPath(entry, variant) {
  const name = entry.rule.split('/')[1];
  return join(entry.directory, `${PLANTED_PREFIX}-${name}-${variant}.${entry.extension}`);
}

function withDirective(entry) {
  const lines = [...entry.lines];
  lines.splice(
    entry.directiveLine,
    0,
    `// eslint-disable-next-line ${entry.rule} -- ${entry.reason}`,
  );
  return lines;
}

const planted = CASES.flatMap((entry) => [
  { entry, variant: 'bare', path: plantedPath(entry, 'bare'), lines: entry.lines },
  { entry, variant: 'disabled', path: plantedPath(entry, 'disabled'), lines: withDirective(entry) },
]);

const codesByPath = new Map();

function lintPlantedFiles() {
  let output;
  try {
    output = execFileSync(OXLINT, ['--format', 'json', ...planted.map((file) => file.path)], {
      cwd: REPOSITORY_ROOT,
      encoding: 'utf8',
    });
  } catch (error) {
    output = String(error.stdout);
  }
  return JSON.parse(output.slice(output.indexOf('{'))).diagnostics;
}

beforeAll(() => {
  for (const file of planted) {
    writeFileSync(join(REPOSITORY_ROOT, file.path), `${file.lines.join('\n')}\n`);
  }
  for (const diagnostic of lintPlantedFiles()) {
    codesByPath.set(diagnostic.filename, [
      ...(codesByPath.get(diagnostic.filename) ?? []),
      diagnostic.code ?? null,
    ]);
  }
}, 60_000);

afterAll(() => {
  for (const file of planted) rmSync(join(REPOSITORY_ROOT, file.path), { force: true });
});

const bare = planted
  .filter((file) => file.variant === 'bare')
  .map((file) => [file.entry.rule, file]);
const disabled = planted
  .filter((file) => file.variant === 'disabled')
  .map((file) => [file.entry.rule, file]);

describe('an eslint-disable comment with a reason, under the real oxlint configuration', () => {
  it.each(bare)('%s reports the planted defect without the comment', (_rule, file) => {
    expect(codesByPath.get(file.path) ?? []).toContain(file.entry.code);
  });

  it.each(disabled)(
    '%s is silenced by the comment, and nothing else is reported',
    (_rule, file) => {
      expect(codesByPath.get(file.path) ?? []).toEqual([]);
    },
  );
});
