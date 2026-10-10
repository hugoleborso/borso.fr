import { GAME_ERROR_CODES } from '@domain/game-error.core';
import { UNKNOWN_FAILURE_CODE } from './api-failure.core';

export const DISPLAYED_ERROR_CODES = [...GAME_ERROR_CODES, UNKNOWN_FAILURE_CODE] as const;
