/**
 * @Feature concert-registrations
 * @DependsOnExternal browser-local-storage
 */

import { z } from 'zod';

const REGISTRATION_KEY_PREFIX = 'pragma.registration.';

const storedRegistrationSchema = z.object({
  registrationId: z.string().min(1),
  editToken: z.string().min(1),
});

export type StoredRegistration = z.infer<typeof storedRegistrationSchema>;

function registrationKeyOfConcert(sessionId: string): string {
  return `${REGISTRATION_KEY_PREFIX}${sessionId}`;
}

function parseStoredRegistration(raw: string | null): StoredRegistration | null {
  try {
    const checked = storedRegistrationSchema.safeParse(JSON.parse(String(raw)));
    return checked.success ? checked.data : null;
  } catch {
    return null;
  }
}

// @FollowsBlueprint adapter-storage-keyed-by-record
export function readStoredRegistration(sessionId: string): StoredRegistration | null {
  return parseStoredRegistration(localStorage.getItem(registrationKeyOfConcert(sessionId)));
}

export function rememberFirstRegistration(
  sessionId: string,
  registration: StoredRegistration,
): void {
  if (readStoredRegistration(sessionId) !== null) return;
  localStorage.setItem(registrationKeyOfConcert(sessionId), JSON.stringify(registration));
}

export function forgetRegistration(sessionId: string): void {
  localStorage.removeItem(registrationKeyOfConcert(sessionId));
}
