import { recordProductEvent, reportTaggedError } from '@/observability/error-reporting.adapter';
import { readErrorTags } from '@/observability/error-reporting.core';
import { pickRandomCandidate, scheduleTimeoutCallback } from '@/openings/machineEffects';
import { readOpponentStrength } from '@/state/appState';
import { createDeckGameMachine } from './deck-game-machine.utils';
import { stockfishClient } from './stockfish-client.setup';

// @FollowsBlueprint machine-singleton
export const deckGameMachine = createDeckGameMachine({
  readStrength: readOpponentStrength,
  warmUpStockfish: stockfishClient.warmUp,
  findStockfishMove: stockfishClient.findMove,
  stopStockfish: stockfishClient.stop,
  pickRandom: pickRandomCandidate,
  scheduleTimeout: scheduleTimeoutCallback,
  recordProductEvent,
  reportError: (error) => {
    reportTaggedError(error, readErrorTags(error));
  },
});
