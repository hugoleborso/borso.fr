import { hashEditToken } from './concert-registrations.core';
import {
  findRegistrationById,
  findRegistrationHoldingToken,
} from './concert-registrations.repository';
import { refuse, type Refused } from './concert-registrations.types';

export interface CheckRegistrationParams {
  readonly registrationId: string;
  readonly editToken: string;
}

export type RegistrationCheckOutcome = { kind: 'ok' } | Refused;

// @FollowsBlueprint service-orchestration
export async function checkRegistration(
  params: CheckRegistrationParams,
): Promise<RegistrationCheckOutcome> {
  const holder = await findRegistrationHoldingToken(
    params.registrationId,
    hashEditToken(params.editToken),
  );
  if (holder !== null) return { kind: 'ok' };
  const registration = await findRegistrationById(params.registrationId);
  return refuse(registration === null ? 'unknown-registration' : 'invalid-registration-token');
}
