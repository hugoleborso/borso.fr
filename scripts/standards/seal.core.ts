export interface SealEntry {
  readonly contentHash: string;
  readonly path: string;
  readonly ledgerHash: string;
  readonly reviewer: string;
  readonly sealedAt: string;
  readonly note: string;
}

export type SealParseOutcome =
  | { readonly ok: true; readonly entry: SealEntry }
  | { readonly ok: false; readonly reason: string };

function readStringField(source: Record<string, unknown>, field: string): string | null {
  const held = source[field];
  return typeof held === 'string' ? held : null;
}

export function parseSealLine(line: string): SealParseOutcome {
  let decoded: unknown;
  try {
    decoded = JSON.parse(line);
  } catch {
    return { ok: false, reason: 'not JSON' };
  }
  if (typeof decoded !== 'object' || decoded === null || Array.isArray(decoded)) {
    return { ok: false, reason: 'not an object' };
  }
  const fields: Record<string, unknown> = { ...decoded };
  const contentHash = readStringField(fields, 'contentHash');
  if (contentHash === null) return { ok: false, reason: 'missing contentHash' };
  const path = readStringField(fields, 'path');
  if (path === null) return { ok: false, reason: 'missing path' };
  const ledgerHash = readStringField(fields, 'ledgerHash');
  if (ledgerHash === null) return { ok: false, reason: 'missing ledgerHash' };
  const reviewer = readStringField(fields, 'reviewer');
  if (reviewer === null) return { ok: false, reason: 'missing reviewer' };
  const sealedAt = readStringField(fields, 'sealedAt');
  if (sealedAt === null) return { ok: false, reason: 'missing sealedAt' };
  const note = readStringField(fields, 'note');
  if (note === null) return { ok: false, reason: 'missing note' };
  return { ok: true, entry: { contentHash, path, ledgerHash, reviewer, sealedAt, note } };
}

export function serialiseSealEntry(entry: SealEntry): string {
  return JSON.stringify({
    contentHash: entry.contentHash,
    path: entry.path,
    ledgerHash: entry.ledgerHash,
    reviewer: entry.reviewer,
    sealedAt: entry.sealedAt,
    note: entry.note,
  });
}

export function readSealLedger(contents: string): readonly SealEntry[] {
  const entries: SealEntry[] = [];
  for (const line of contents.split('\n')) {
    const outcome = parseSealLine(line);
    if (outcome.ok) entries.push(outcome.entry);
  }
  return entries;
}

export interface ReviewableFile {
  readonly path: string;
  readonly contentHash: string;
}

export type SealFailureReason = 'unsealed' | 'sealed-against-an-older-ledger';

export interface SealFailure {
  readonly path: string;
  readonly reason: SealFailureReason;
}

export interface SealVerification {
  readonly failures: readonly SealFailure[];
  readonly sealedCount: number;
}

export function verifySeals(
  reviewable: readonly ReviewableFile[],
  ledger: readonly SealEntry[],
  currentLedgerHash: string,
): SealVerification {
  const failures: SealFailure[] = [];
  let sealedCount = 0;
  for (const file of reviewable) {
    const matching = ledger.filter((entry) => entry.contentHash === file.contentHash);
    if (matching.length === 0) {
      failures.push({ path: file.path, reason: 'unsealed' });
      continue;
    }
    if (!matching.some((entry) => entry.ledgerHash === currentLedgerHash)) {
      failures.push({ path: file.path, reason: 'sealed-against-an-older-ledger' });
      continue;
    }
    sealedCount += 1;
  }
  return { failures, sealedCount };
}

const REVIEWABLE_EXTENSIONS = ['.ts', '.tsx'];
const EXCLUDED_SUFFIXES = ['.test.ts', '.test.tsx', '.test-utils.ts', '.test-utils.tsx', '.d.ts'];
const REVIEWABLE_ROOTS = ['apps/', 'infra/'];
const EXCLUDED_DIRECTORY_SEGMENT = '/test/';

const REVIEWABLE_FILENAME = 'VOCABULARY.md';

export function isReviewablePath(path: string): boolean {
  if (!REVIEWABLE_ROOTS.some((root) => path.startsWith(root))) return false;
  if (path.endsWith(`/${REVIEWABLE_FILENAME}`)) return true;
  if (!REVIEWABLE_EXTENSIONS.some((extension) => path.endsWith(extension))) return false;
  if (path.includes(EXCLUDED_DIRECTORY_SEGMENT)) return false;
  return !EXCLUDED_SUFFIXES.some((suffix) => path.endsWith(suffix));
}
