import { didDeleteRegistrationOfConcert } from './concert-registrations.repository';
import { refuse, type Refused } from './concert-registrations.types';

export interface RemoveRegistrationParams {
  readonly sessionId: string;
  readonly registrationId: string;
}

export type RemoveRegistrationOutcome = { kind: 'ok' } | Refused;

// @FollowsBlueprint service-orchestration
export async function removeRegistration(
  params: RemoveRegistrationParams,
): Promise<RemoveRegistrationOutcome> {
  const isDeleted = await didDeleteRegistrationOfConcert(params.sessionId, params.registrationId);
  return isDeleted ? { kind: 'ok' } : refuse('unknown-registration');
}
