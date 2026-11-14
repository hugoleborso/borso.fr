import { derivePositionKey } from '@domain/position-key.core';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { stockfishClient } from '@/opponent/stockfish-client.setup';
import {
  type EvaluationReading,
  isEvaluationRetried,
  listEvaluationCommands,
  readStockfishEvaluation,
  type StockfishEvaluation,
} from '@/opponent/stockfish-evaluation.core';

const EVALUATION_CACHE_MINUTES = 30;
const EVALUATION_CACHE_MILLISECONDS = EVALUATION_CACHE_MINUTES * 60 * 1000;

export const stockfishEvaluationKeys = {
  all: ['stockfish-evaluation'] as const,
  position: (fen: string) => [...stockfishEvaluationKeys.all, derivePositionKey(fen)] as const,
};

async function evaluatePosition(
  fen: string,
  signal: AbortSignal,
): Promise<StockfishEvaluation | null> {
  const lines = await stockfishClient.searchPosition({
    commands: listEvaluationCommands(fen),
    signal,
  });
  return lines === null ? null : readStockfishEvaluation(lines, fen);
}

// @FollowsBlueprint query-module
export function useStockfishEvaluation(fen: string, isWanted: boolean): EvaluationReading {
  const evaluation = useQuery({
    queryKey: stockfishEvaluationKeys.position(fen),
    queryFn: ({ signal }) => evaluatePosition(fen, signal),
    enabled: isWanted,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: EVALUATION_CACHE_MILLISECONDS,
    networkMode: 'always',
    retry: isEvaluationRetried,
    retryDelay: 0,
    placeholderData: keepPreviousData,
  });
  return { evaluation: evaluation.data ?? null, hasFailed: evaluation.isError };
}
