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
  if (raw === null) return null;
  try {
    const checked = storedRegistrationSchema.safeParse(JSON.parse(raw));
    return checked.success ? checked.data : null;
  } catch {
    return null;
  }
}

// @FollowsBlueprint adapter-storage-keyed-by-record
export function readStoredRegistration(sessionId: string): StoredRegistration | null {
  return parseStoredRegistration(localStorage.getItem(registrationKeyOfConcert(sessionId)));
}

export function writeRegistration(sessionId: string, registration: StoredRegistration): void {
  localStorage.setItem(registrationKeyOfConcert(sessionId), JSON.stringify(registration));
}
