import { z } from 'zod';
import { isTalosError, TALOS_ERRORS, type TalosErrorStatus } from './talos-error.types';

const UNEXPECTED_FAILURE_STATUS = 500;
const UNEXPECTED_FAILURE_MESSAGE = 'Erreur inattendue.';
const FIRST_CLIENT_ERROR_STATUS = 400;
const LAST_CLIENT_ERROR_STATUS = 499;

const clientFailureSchema = z.object({
  status: z.number().int().min(FIRST_CLIENT_ERROR_STATUS).max(LAST_CLIENT_ERROR_STATUS),
});

export interface ErrorResponse {
  readonly body: { readonly error: string };
  readonly status: TalosErrorStatus | typeof UNEXPECTED_FAILURE_STATUS;
}

function selectTalosErrorResponse(failure: unknown): ErrorResponse | null {
  if (isTalosError(failure)) {
    const definition = TALOS_ERRORS[failure.code];
    return { body: { error: definition.message }, status: definition.status };
  }
  if (clientFailureSchema.safeParse(failure).success) {
    const invalidInput = TALOS_ERRORS['invalid-input'];
    return { body: { error: invalidInput.message }, status: invalidInput.status };
  }
  return null;
}

// @FollowsBlueprint core-failure-to-response
export function selectErrorResponse(failure: unknown): ErrorResponse {
  return (
    selectTalosErrorResponse(failure) ?? {
      body: { error: UNEXPECTED_FAILURE_MESSAGE },
      status: UNEXPECTED_FAILURE_STATUS,
    }
  );
}
