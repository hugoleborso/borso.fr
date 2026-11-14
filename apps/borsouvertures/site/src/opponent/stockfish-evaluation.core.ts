import type { Side } from '@/state/persistedState.utils';

export type StockfishEvaluation =
  | { kind: 'centipawns'; whiteCentipawns: number }
  | { kind: 'mate'; winner: Side; moveCount: number };

export type EvaluationLabelKind =
  | 'pending'
  | 'equal'
  | 'white-ahead'
  | 'black-ahead'
  | 'white-mates'
  | 'black-mates'
  | 'white-won'
  | 'black-won';

export type EvaluationTextEnd = 'top' | 'bottom';

export const STOCKFISH_SEARCH_STOPPED_ERROR_NAME = 'StockfishSearchStoppedError';

const EVALUATION_LABEL_KEY_BY_KIND = {
  pending: 'board.evaluation.pending',
  equal: 'board.evaluation.equal',
  'white-ahead': 'board.evaluation.white-ahead',
  'black-ahead': 'board.evaluation.black-ahead',
  'white-mates': 'board.evaluation.white-mates',
  'black-mates': 'board.evaluation.black-mates',
  'white-won': 'board.evaluation.white-won',
  'black-won': 'board.evaluation.black-won',
} as const satisfies Record<EvaluationLabelKind, string>;

export type EvaluationLabelKey = (typeof EVALUATION_LABEL_KEY_BY_KIND)[EvaluationLabelKind];

export interface EvaluationBarView {
  isVisible: boolean;
  whiteSharePercent: number;
  isWhiteAtBottom: boolean;
  text: string;
  textEnd: EvaluationTextEnd;
  isTextOnWhite: boolean;
  labelKind: EvaluationLabelKind;
  labelKey: EvaluationLabelKey;
  amount: string;
  moveCount: number;
}

export interface EvaluationReading {
  evaluation: StockfishEvaluation | null;
  hasFailed: boolean;
}

export const EVALUATION_DEPTH = 14;
export const EVALUATION_TIME_LIMIT_MILLISECONDS = 500;

const STRONGEST_SKILL_LEVEL = 20;
const SCORE_PATTERN = /^info .*\bscore (cp|mate) (-?\d+)\b(?! (?:lower|upper)bound)/;
const CENTIPAWNS_PER_PAWN = 100;
const ROUNDING_STEPS_PER_PAWN = 10;
const WHOLE_PAWNS_FROM = 10;
const WINNING_CHANCE_SLOPE = 0.003_682_08;
const WINNING_CHANCE_SPAN = 2;
const RETRIES_AFTER_A_STOP = 1;
const HALF_BAR_PERCENT = 50;
const FULL_BAR_PERCENT = 100;
const BLACK_TO_MOVE_FIELD = 'b';
const WIN_TEXT_BY_WINNER: Record<Side, string> = { white: '1-0', black: '0-1' };
const MATE_SIGN_BY_WINNER: Record<Side, string> = { white: '', black: '-' };

const PENDING_VIEW_FIELDS = {
  whiteSharePercent: HALF_BAR_PERCENT,
  text: '',
  labelKind: 'pending',
  amount: '',
  moveCount: 0,
} as const satisfies Partial<EvaluationBarView>;

// @FollowsBlueprint core-projection
export function listEvaluationCommands(fen: string): string[] {
  return [
    'setoption name UCI_LimitStrength value false',
    `setoption name Skill Level value ${STRONGEST_SKILL_LEVEL}`,
    `position fen ${fen}`,
    `go depth ${EVALUATION_DEPTH} movetime ${EVALUATION_TIME_LIMIT_MILLISECONDS}`,
  ];
}

function readSideToMove(fen: string): Side {
  return fen.split(' ')[1] === BLACK_TO_MOVE_FIELD ? 'black' : 'white';
}

function selectOtherSide(side: Side): Side {
  return side === 'white' ? 'black' : 'white';
}

function readMateEvaluation(sideToMove: Side, mateIn: number): StockfishEvaluation {
  const winner = mateIn > 0 ? sideToMove : selectOtherSide(sideToMove);
  return { kind: 'mate', winner, moveCount: Math.abs(mateIn) };
}

export function readStockfishEvaluation(
  lines: readonly string[],
  fen: string,
): StockfishEvaluation | null {
  const match = lines
    .toReversed()
    .map((line) => SCORE_PATTERN.exec(line))
    .find((candidate): candidate is RegExpExecArray => candidate !== null);
  if (match === undefined) return null;
  const sideToMove = readSideToMove(fen);
  const amount = Number(match[2]);
  if (match[1] === 'mate') return readMateEvaluation(sideToMove, amount);
  const whiteCentipawns = sideToMove === 'white' ? amount : -amount;
  return { kind: 'centipawns', whiteCentipawns };
}

function selectWhiteSharePercent(evaluation: StockfishEvaluation): number {
  if (evaluation.kind === 'mate') {
    return evaluation.winner === 'white' ? FULL_BAR_PERCENT : 0;
  }
  const winningChance =
    WINNING_CHANCE_SPAN / (1 + Math.exp(-WINNING_CHANCE_SLOPE * evaluation.whiteCentipawns)) - 1;
  return HALF_BAR_PERCENT + HALF_BAR_PERCENT * winningChance;
}

function selectCentipawnLabel(tenths: number): CentipawnLabelKind {
  if (tenths > 0) return 'white-ahead';
  if (tenths < 0) return 'black-ahead';
  return 'equal';
}

const SIGN_BY_CENTIPAWN_LABEL = { equal: '', 'white-ahead': '+', 'black-ahead': '-' } as const;

type CentipawnLabelKind = keyof typeof SIGN_BY_CENTIPAWN_LABEL;

interface EvaluationWording {
  text: string;
  labelKind: EvaluationLabelKind;
  amount: string;
  moveCount: number;
}

function wordEvaluation(evaluation: StockfishEvaluation): EvaluationWording {
  if (evaluation.kind === 'mate') {
    const { winner, moveCount } = evaluation;
    if (moveCount === 0) {
      return {
        text: WIN_TEXT_BY_WINNER[winner],
        labelKind: `${winner}-won`,
        amount: '',
        moveCount,
      };
    }
    return {
      text: `${MATE_SIGN_BY_WINNER[winner]}M${moveCount}`,
      labelKind: `${winner}-mates`,
      amount: '',
      moveCount,
    };
  }
  const tenths = Math.round(
    (evaluation.whiteCentipawns * ROUNDING_STEPS_PER_PAWN) / CENTIPAWNS_PER_PAWN,
  );
  const pawns = Math.abs(tenths) / ROUNDING_STEPS_PER_PAWN;
  const amount = pawns >= WHOLE_PAWNS_FROM ? String(Math.round(pawns)) : pawns.toFixed(1);
  const labelKind = selectCentipawnLabel(tenths);
  return {
    text: `${SIGN_BY_CENTIPAWN_LABEL[labelKind]}${amount}`,
    labelKind,
    amount,
    moveCount: 0,
  };
}

export function selectEvaluationBarView(
  reading: EvaluationReading,
  orientation: Side,
): EvaluationBarView {
  const isWhiteAtBottom = orientation === 'white';
  const fields =
    reading.evaluation === null
      ? PENDING_VIEW_FIELDS
      : {
          whiteSharePercent: selectWhiteSharePercent(reading.evaluation),
          ...wordEvaluation(reading.evaluation),
        };
  const isTextOnWhite = fields.whiteSharePercent >= HALF_BAR_PERCENT;
  return {
    ...fields,
    labelKey: EVALUATION_LABEL_KEY_BY_KIND[fields.labelKind],
    isVisible: !reading.hasFailed,
    isWhiteAtBottom,
    isTextOnWhite,
    textEnd: isTextOnWhite === isWhiteAtBottom ? 'bottom' : 'top',
  };
}

export function selectShownEvaluationBar(
  isEvaluationBarShown: boolean,
  reading: EvaluationReading,
  orientation: Side,
): EvaluationBarView | null {
  return isEvaluationBarShown ? selectEvaluationBarView(reading, orientation) : null;
}

export function isEvaluationRetried(failureCount: number, error: Error): boolean {
  return failureCount < RETRIES_AFTER_A_STOP && error.name === STOCKFISH_SEARCH_STOPPED_ERROR_NAME;
}
