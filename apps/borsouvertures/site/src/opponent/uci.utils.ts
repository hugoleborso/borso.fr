const MATE_SCORE_CENTIPAWNS = 10_000;
const SCORE_PATTERN = /^info .*\bscore (cp|mate) (-?\d+)( (?:lower|upper)bound)?/;
const BEST_MOVE_PATTERN = /^bestmove ([a-h][1-8][a-h][1-8][bnqr]?)(?: |$)/;
const HANDSHAKE_DONE_LINE = 'uciok';
const READY_LINE = 'readyok';

// @FollowsBlueprint utils-pure-module
export function parseUciScore(line: string): number | null {
  const match = SCORE_PATTERN.exec(line);
  if (match === null || match[3] !== undefined) return null;
  const amount = Number(match[2]);
  return match[1] === 'mate' ? Math.sign(amount) * MATE_SCORE_CENTIPAWNS : amount;
}

export function parseBestMove(line: string): string | null {
  return BEST_MOVE_PATTERN.exec(line)?.[1] ?? null;
}

export function isSearchFinished(line: string): boolean {
  return line.startsWith('bestmove');
}

export function isHandshakeDone(line: string): boolean {
  return line.trim() === HANDSHAKE_DONE_LINE;
}

export function isEngineReady(line: string): boolean {
  return line.trim() === READY_LINE;
}
