import type { ReaderMove } from './deck-build.core';

export const READER_MOVE_MARGIN_CENTIPAWNS = 100;
export const EXCEPTION_CEILING_CENTIPAWNS = 250;
export const SEARCH_DEPTH = 16;
export const ENGINE_HASH_MEGABYTES = 64;

export interface EngineSearch {
  scoreCentipawns: number;
  bestMoveUci: string;
}

export type GateVerdict =
  | 'inside-margin'
  | 'excused'
  | 'over-margin'
  | 'over-ceiling'
  | 'stale-exception';

export interface GateFinding {
  move: ReaderMove;
  lossCentipawns: number;
  bestMoveUci: string;
  verdict: GateVerdict;
}

const PASSING_VERDICTS: ReadonlySet<GateVerdict> = new Set(['inside-margin', 'excused']);
const PATH_SEPARATOR = ' ';
const STUB_INDENT_SPACES = 2;

const VERDICT_SENTENCES: Record<GateVerdict, string> = {
  'inside-margin': 'is inside the margin',
  excused: 'is over the margin and carries an exception',
  'over-margin': `loses more than ${READER_MOVE_MARGIN_CENTIPAWNS} centipawns and carries no exception`,
  'over-ceiling': `loses more than ${EXCEPTION_CEILING_CENTIPAWNS} centipawns, which no exception excuses`,
  'stale-exception': 'is inside the margin, so its exception excuses nothing and must go',
};

export function listMovesToCheck(
  readerMoves: readonly ReaderMove[],
  deckId: string | null,
): ReaderMove[] {
  const checked = new Map<string, ReaderMove>();
  for (const move of readerMoves) {
    const key = `${move.positionKey}${PATH_SEPARATOR}${move.moveUci}`;
    const isInScope = deckId === null || move.deckId === deckId;
    if (isInScope && !checked.has(key)) checked.set(key, move);
  }
  return [...checked.values()];
}

export function isForcedSearchNeeded(free: EngineSearch, bookMoveUci: string): boolean {
  return free.bestMoveUci !== bookMoveUci;
}

export function computeLoss(free: EngineSearch, forced: EngineSearch | null): number {
  return forced === null ? 0 : free.scoreCentipawns - forced.scoreCentipawns;
}

// @FollowsBlueprint core-decision
export function decideGateVerdict(lossCentipawns: number, hasException: boolean): GateVerdict {
  if (lossCentipawns > EXCEPTION_CEILING_CENTIPAWNS) return 'over-ceiling';
  if (lossCentipawns > READER_MOVE_MARGIN_CENTIPAWNS)
    return hasException ? 'excused' : 'over-margin';
  return hasException ? 'stale-exception' : 'inside-margin';
}

export function buildGateFinding(
  move: ReaderMove,
  free: EngineSearch,
  forced: EngineSearch | null,
): GateFinding {
  const lossCentipawns = computeLoss(free, forced);
  return {
    move,
    lossCentipawns,
    bestMoveUci: free.bestMoveUci,
    verdict: decideGateVerdict(lossCentipawns, move.exception !== null),
  };
}

export function isGatePassed(findings: readonly GateFinding[]): boolean {
  return findings.every((finding) => PASSING_VERDICTS.has(finding.verdict));
}

export function formatFinding(finding: GateFinding): string {
  const { move } = finding;
  return `${move.deckId}: ${move.pathSan.join(PATH_SEPARATOR)} loses ${finding.lossCentipawns} centipawns (best ${finding.bestMoveUci}) and ${VERDICT_SENTENCES[finding.verdict]}`;
}

function formatExceptionStub(finding: GateFinding): string {
  return JSON.stringify({ movesSan: finding.move.pathSan, reason: '' }, null, STUB_INDENT_SPACES);
}

export function formatGateReport(findings: readonly GateFinding[]): string[] {
  const reported = findings.filter((finding) => finding.verdict !== 'inside-margin');
  const stubs = findings
    .filter((finding) => finding.verdict === 'over-margin')
    .map((finding) => formatExceptionStub(finding));
  const summary = `${findings.length} reader moves checked at depth ${SEARCH_DEPTH}, ${
    findings.filter((finding) => !PASSING_VERDICTS.has(finding.verdict)).length
  } failed`;
  return [...reported.map((finding) => formatFinding(finding)), ...stubs, summary];
}
