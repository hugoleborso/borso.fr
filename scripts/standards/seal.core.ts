/**
 * The seal: what the standards review agent leaves behind, and what CI checks
 * without running any inference of its own.
 *
 * Some rules in `docs/standards/` cannot be a lint rule. Whether a comment says
 * something the code cannot, whether a name is the one the domain uses, whether
 * an effect is genuinely synchronising with an external system: a person or an
 * agent has to read those. The ledger already lists them, as the `reviewer`
 * bullets under each standard.
 *
 * Running an agent inside CI to check them is not an option here, so CI checks
 * a record instead. The agent reviews a file and records the SHA-256 of the
 * content it approved. CI hashes the files the branch changed and fails when a
 * hash is missing. Hashing is deterministic and needs no model.
 *
 * Sealing the content rather than the path is deliberate. A file that moves
 * without changing keeps its seal, because a rename is not something the review
 * would say anything new about, and the mass renames this repository does would
 * otherwise invalidate every seal for no reading.
 *
 * The seal is an attestation and not a signature. Nothing stops anyone
 * appending a line by hand; there is no secret in a checkout to sign with. What
 * it does stop is the common failure, which is reviewing a file and then
 * editing it, or never reviewing it at all. It also records which ledger the
 * review was made against, so a standard that changes invalidates the seals
 * taken under the old wording.
 */

export interface SealEntry {
  /** SHA-256 of the file content the reviewer approved. */
  readonly contentHash: string;
  /** Where the file was when it was reviewed, for the reader rather than the check. */
  readonly path: string;
  /** SHA-256 of `enforcement-ledger.md` at review time. */
  readonly ledgerHash: string;
  readonly reviewer: string;
  readonly sealedAt: string;
  /** What the reviewer wants the next reader to know, if anything. */
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

/** One entry per line, so two branches that both seal files merge by union. */
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

/**
 * Every seal a ledger file holds.
 *
 * A line that is not one — a blank, a `#` comment, a half-written entry — fails
 * to parse and is skipped. None of those kinds needs recognising separately,
 * because none of them is JSON.
 */
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

/**
 * Which of the branch's changed files the agent has not cleared.
 *
 * A seal taken against an older ledger is reported separately, because the
 * standard it was read against has since been reworded and the reading may no
 * longer hold.
 */
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
/**
 * A directory whose whole contents exist to run the suite.
 *
 * Matching the `.test-utils.ts` suffix alone missed every helper that lives in
 * a `test/` folder under a name of its own: `database-utils.ts`,
 * `setup-postgres.ts`, `fixtures.ts`, `helpers/template.ts`. Ten such files
 * across four workspaces were asked for a seal, which is the same mistake as
 * asking for one on a lock file — a reviewer reading a fixture against the
 * standards learns nothing, and being asked to is how sealing without reading
 * starts.
 */
const EXCLUDED_DIRECTORY_SEGMENT = '/test/';

/**
 * Prose a reviewer bullet already asks somebody to check against the code, and
 * which no other gate reads. `01-naming.md` asks a reviewer whether each entry
 * in a `VOCABULARY.md` is still true; nothing pointed the seal at the file, so
 * a definition could go false against the branch that falsified it and every
 * mechanical check stayed green. Hashing it here does not make the prose
 * checkable — it makes the review of it recorded, which is the whole mechanism.
 *
 * One name rather than a list: a list of one cannot distinguish `some` from
 * `every`, so the mutation gate reports an equivalent mutant it is right to
 * report. A second name brings the list back, with the cases that tell them
 * apart.
 */
const REVIEWABLE_FILENAME = 'VOCABULARY.md';

/**
 * The files a seal is asked for. Application and infrastructure source, plus
 * the prose named above: the standards are about that code, and asking for a
 * seal on a generated page or a lock file would train everyone to seal without
 * reading.
 */
export function isReviewablePath(path: string): boolean {
  if (!REVIEWABLE_ROOTS.some((root) => path.startsWith(root))) return false;
  if (path.endsWith(`/${REVIEWABLE_FILENAME}`)) return true;
  if (!REVIEWABLE_EXTENSIONS.some((extension) => path.endsWith(extension))) return false;
  if (path.includes(EXCLUDED_DIRECTORY_SEGMENT)) return false;
  return !EXCLUDED_SUFFIXES.some((suffix) => path.endsWith(suffix));
}
