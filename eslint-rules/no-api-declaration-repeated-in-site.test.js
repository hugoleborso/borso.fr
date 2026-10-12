import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createRuleTester } from './rule-tester.js';
import rule, {
  createRepeatedDeclarationRule,
  isSharedRuleName,
  listContractDeclarations,
  readApplicationRoot,
  readDeclarationsFromDisk,
} from './no-api-declaration-repeated-in-site.js';

const siteFile = 'apps/banana-rush/site/src/routes/HomePage.tsx';

const declarations = new Map([
  ['JOIN_CODE_LENGTH', 'apps/banana-rush/api/src/games/games.schema.ts'],
  ['MINIMUM_SEATS', 'apps/banana-rush/domain/game-setup.core.ts'],
  ['haversineDistanceMeters', 'apps/banana-rush/api/src/helpers/geo/haversine.utils.ts'],
]);

const ruleOverFixedDeclarations = createRepeatedDeclarationRule(() => declarations);

// @FollowsBlueprint test-lint-rule
createRuleTester(siteFile).run('no-api-declaration-repeated-in-site', ruleOverFixedDeclarations, {
  valid: [
    "import { JOIN_CODE_LENGTH } from '@domain/join-code.core';",
    'const DEFAULT_WINNING_SCORE = 30;',
    'function HomePage() { const JOIN_CODE_LENGTH = 4; return JOIN_CODE_LENGTH; }',
    'let JOIN_CODE_LENGTH = 4;',
    'const joinCodeLength = 4;',
    'export const { JOIN_CODE_LENGTH } = limits;',
    'export default function HomePage() { return null; }',
  ],
  invalid: [
    {
      code: 'const JOIN_CODE_LENGTH = 4;',
      errors: [{ messageId: 'repeatedDeclaration' }],
    },
    {
      code: 'export const MINIMUM_SEATS = 2;',
      errors: [{ messageId: 'repeatedDeclaration' }],
    },
    {
      code: 'export function haversineDistanceMeters() { return 0; }',
      errors: [{ messageId: 'repeatedDeclaration' }],
    },
    {
      code: 'function haversineDistanceMeters() { return 0; }',
      errors: [{ messageId: 'repeatedDeclaration' }],
    },
    {
      code: 'const SHOWCASE = 3, MINIMUM_SEATS = 2;',
      errors: [{ messageId: 'repeatedDeclaration' }],
    },
  ],
});

createRuleTester('apps/banana-rush/site/src/routes/HomePage.test.tsx').run(
  'no-api-declaration-repeated-in-site (test file)',
  ruleOverFixedDeclarations,
  { valid: ['const JOIN_CODE_LENGTH = 4;'], invalid: [] },
);

createRuleTester('apps/banana-rush/api/src/games/games.schema.ts', { jsx: false }).run(
  'no-api-declaration-repeated-in-site (api file)',
  ruleOverFixedDeclarations,
  { valid: ['export const JOIN_CODE_LENGTH = 4;'], invalid: [] },
);

createRuleTester(siteFile).run('no-api-declaration-repeated-in-site', ruleOverFixedDeclarations, {
  valid: [
    [
      '// eslint-disable-next-line rule-to-test/no-api-declaration-repeated-in-site -- a reason a reviewer can check',
      'const JOIN_CODE_LENGTH = 4;',
    ].join('\n'),
  ],
  invalid: [],
});

describe('listContractDeclarations', () => {
  it('reads an exported constant from any back end file', () => {
    expect(
      listContractDeclarations(
        'pragma/api/src/bars/bar-support.core.ts',
        'export const CONCERT_MOODS = [];',
      ),
    ).toEqual(['CONCERT_MOODS']);
  });

  it('reads a private constant from a schema file, where it is an input limit', () => {
    expect(
      listContractDeclarations(
        'pragma/api/src/sessions/sessions.schema.ts',
        'const VENUE_MAX = 256;',
      ),
    ).toEqual(['VENUE_MAX']);
  });

  it('ignores a private constant outside a schema file', () => {
    expect(
      listContractDeclarations('pragma/api/src/auth/auth.service.ts', 'const SESSION_TTL = 3;'),
    ).toEqual([]);
  });

  it('ignores a unit conversion, which is a fact rather than a rule', () => {
    expect(
      listContractDeclarations(
        'pragma/api/src/songs/songs.schema.ts',
        'const SECONDS_PER_MINUTE = 60;',
      ),
    ).toEqual([]);
  });

  it('reads an exported function from a pure file only', () => {
    const source =
      'export function resolveSetlistStatus() {}\nexport async function listSongs() {}';
    expect(listContractDeclarations('pragma/api/src/setlists/setlists.core.ts', source)).toEqual([
      'resolveSetlistStatus',
      'listSongs',
    ]);
    expect(listContractDeclarations('pragma/api/src/songs/songs.repository.ts', source)).toEqual(
      [],
    );
  });
});

describe('isSharedRuleName', () => {
  it('keeps a limit and drops a conversion factor', () => {
    expect(isSharedRuleName('CAPO_MAX')).toBe(true);
    expect(isSharedRuleName('MILLISECONDS_PER_SECOND')).toBe(false);
    expect(isSharedRuleName('BYTES_PER_MEBIBYTE')).toBe(false);
    expect(isSharedRuleName('MAX_POINTS_PER_SONG')).toBe(true);
  });
});

describe('readApplicationRoot', () => {
  it('reads the application folder out of a site path', () => {
    expect(readApplicationRoot('/repository/apps/pragma/site/src/App.tsx')).toBe(
      '/repository/apps/pragma',
    );
  });

  it('answers null outside a site', () => {
    expect(readApplicationRoot('/repository/apps/pragma/api/src/app.ts')).toBeNull();
  });
});

describe('readDeclarationsFromDisk', () => {
  it('indexes a real application without its test files', () => {
    const indexed = readDeclarationsFromDisk(path.resolve('apps/banana-rush'));
    expect(indexed.get('MINIMUM_SEATS')).toBe('apps/banana-rush/domain/game-setup.core.ts');
    expect([...indexed.values()].some((source) => source.includes('.test.'))).toBe(false);
  });

  it('answers an empty index for a folder that does not exist', () => {
    expect(readDeclarationsFromDisk(path.resolve('apps/does-not-exist')).size).toBe(0);
  });
});

describe('default export', () => {
  it('is the rule wired to the disk', () => {
    expect(rule.meta.messages.repeatedDeclaration).toContain('domain');
  });
});
