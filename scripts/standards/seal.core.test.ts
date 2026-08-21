import { describe, expect, it } from 'vitest';
import {
  isReviewablePath,
  parseSealLine,
  readSealLedger,
  serialiseSealEntry,
  verifySeals,
  type SealEntry,
} from './seal.core';

function buildEntry(overrides: Partial<SealEntry> = {}): SealEntry {
  return {
    contentHash: 'a'.repeat(64),
    path: 'apps/pragma/api/src/songs/songs.service.ts',
    ledgerHash: 'b'.repeat(64),
    reviewer: 'standards-reviewer',
    sealedAt: '2026-08-15T09:00:00.000Z',
    note: '',
    ...overrides,
  };
}

describe('parseSealLine', () => {
  it('reads a well formed line', () => {
    const entry = buildEntry({ note: 'the effect synchronises with Leaflet' });
    const outcome = parseSealLine(serialiseSealEntry(entry));
    expect(outcome).toEqual({ ok: true, entry });
  });

  it('rejects a line that is not JSON', () => {
    expect(parseSealLine('not json at all')).toEqual({ ok: false, reason: 'not JSON' });
  });

  it.each([['[]'], ['null'], ['"a string"'], ['12']])(
    'rejects %s, which is not an object',
    (line) => {
      expect(parseSealLine(line)).toEqual({ ok: false, reason: 'not an object' });
    },
  );

  it.each(['contentHash', 'path', 'ledgerHash', 'reviewer', 'sealedAt', 'note'])(
    'names %s when a line leaves it out',
    (field) => {
      const withoutField: Record<string, unknown> = { ...buildEntry() };
      delete withoutField[field];
      expect(parseSealLine(JSON.stringify(withoutField))).toEqual({
        ok: false,
        reason: `missing ${field}`,
      });
    },
  );

  it('rejects a field that is present and not a string', () => {
    const outcome = parseSealLine(JSON.stringify({ ...buildEntry(), reviewer: 7 }));
    expect(outcome).toEqual({ ok: false, reason: 'missing reviewer' });
  });
});

describe('readSealLedger', () => {
  it('reads every valid line and skips comments and blanks', () => {
    const contents = [
      '# a header comment',
      '',
      serialiseSealEntry(buildEntry()),
      '   ',
      serialiseSealEntry(buildEntry({ contentHash: 'c'.repeat(64) })),
    ].join('\n');
    expect(readSealLedger(contents)).toHaveLength(2);
  });

  it('skips a corrupt line rather than failing the whole ledger', () => {
    const contents = [serialiseSealEntry(buildEntry()), '{ broken'].join('\n');
    expect(readSealLedger(contents)).toHaveLength(1);
  });
});

describe('verifySeals', () => {
  const currentLedgerHash = 'b'.repeat(64);

  it('passes a file whose content carries a current seal', () => {
    const verification = verifySeals(
      [{ path: 'apps/pragma/api/src/songs/songs.service.ts', contentHash: 'a'.repeat(64) }],
      [buildEntry()],
      currentLedgerHash,
    );
    expect(verification.failures).toEqual([]);
    expect(verification.sealedCount).toBe(1);
  });

  it('fails a file whose content the reviewer never cleared', () => {
    const verification = verifySeals(
      [{ path: 'apps/pragma/api/src/songs/songs.service.ts', contentHash: 'd'.repeat(64) }],
      [buildEntry()],
      currentLedgerHash,
    );
    expect(verification.failures).toEqual([
      {
        path: 'apps/pragma/api/src/songs/songs.service.ts',
        reason: 'edited-since-it-was-reviewed',
      },
    ]);
  });

  it('keeps the seal when a file moves without changing', () => {
    const verification = verifySeals(
      [{ path: 'apps/pragma/api/src/catalogue/songs.service.ts', contentHash: 'a'.repeat(64) }],
      [buildEntry()],
      currentLedgerHash,
    );
    expect(verification.failures).toEqual([]);
  });

  it('fails a seal taken against a ledger that has since been reworded', () => {
    const verification = verifySeals(
      [{ path: 'apps/pragma/api/src/songs/songs.service.ts', contentHash: 'a'.repeat(64) }],
      [buildEntry({ ledgerHash: 'stale'.repeat(4) })],
      currentLedgerHash,
    );
    expect(verification.failures).toEqual([
      {
        path: 'apps/pragma/api/src/songs/songs.service.ts',
        reason: 'sealed-against-an-older-ledger',
      },
    ]);
  });

  it('accepts the newest seal when a file was sealed more than once', () => {
    const verification = verifySeals(
      [{ path: 'apps/pragma/api/src/songs/songs.service.ts', contentHash: 'a'.repeat(64) }],
      [buildEntry({ ledgerHash: 'stale'.repeat(4) }), buildEntry()],
      currentLedgerHash,
    );
    expect(verification.failures).toEqual([]);
  });

  it('tells a file edited since its review from one never reviewed at all', () => {
    const reviewed = buildEntry({ contentHash: 'old' });

    const verification = verifySeals(
      [
        { path: 'apps/pragma/api/src/songs/songs.service.ts', contentHash: 'edited' },
        { path: 'apps/pragma/api/src/bars/bars.service.ts', contentHash: 'fresh' },
      ],
      [reviewed],
      currentLedgerHash,
    );

    expect(verification.failures).toStrictEqual([
      {
        path: 'apps/pragma/api/src/songs/songs.service.ts',
        reason: 'edited-since-it-was-reviewed',
      },
      { path: 'apps/pragma/api/src/bars/bars.service.ts', reason: 'never-reviewed' },
    ]);
  });

  it('passes an empty change set', () => {
    expect(verifySeals([], [], currentLedgerHash)).toEqual({ failures: [], sealedCount: 0 });
  });
});

describe('isReviewablePath', () => {
  it.each([
    'apps/pragma/api/src/songs/songs.service.ts',
    'apps/borso-fr/site/src/components/atoms/Button.tsx',
    'infra/cdk/src/constructs/static-site.ts',
    'apps/borso-fr/VOCABULARY.md',
  ])('asks for a seal on %s', (path) => {
    expect(isReviewablePath(path)).toBe(true);
  });

  it.each([
    ['docs/standards/01-naming.md', 'a document is not source'],
    ['docs/VOCABULARY.md', 'the named prose counts under an application, not anywhere'],
    ['apps/pragma/site/NOT-VOCABULARY.md', 'the filename is matched whole, not as a suffix'],
    ['scripts/standards/seal.ts', 'the harness is not what the standards govern'],
    ['apps/pragma/api/src/songs/songs.service.test.ts', 'a test is reviewed with its source'],
    ['apps/pragma/site/src/queries.test-utils.tsx', 'a test helper is reviewed with its suite'],
    ['apps/pragma/test/database-utils.ts', 'a test/ directory holds only what runs the suite'],
    ['apps/last-loop-lepin/test/setup-postgres.ts', 'same, under a name with no test suffix'],
    ['infra/cdk/test/unit/helpers/template.ts', 'same, nested under test/'],
    ['apps/pragma/site/src/react-i18next.d.ts', 'a declaration file carries no logic'],
    ['apps/pragma/site/public/manifest.json', 'not a TypeScript file'],
  ])('asks for no seal on %s, because %s', (path) => {
    expect(isReviewablePath(path)).toBe(false);
  });
});
