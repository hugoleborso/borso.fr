import { beforeEach, describe, expect, it } from 'vitest';
import { readStoredRegistration, rememberFirstRegistration } from './registration-token.adapter';

const A_CONCERT = 'aaaaaaaa-1111-4111-8111-111111111111';
const ANOTHER_CONCERT = 'cccccccc-3333-4333-8333-333333333333';
const A_REGISTRATION = { registrationId: 'registration-1', editToken: 'token-1' };

// @FollowsBlueprint test-pure-unit
describe('the registration the browser remembers per concert', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('reads back the registration written for a concert, and nothing for another', () => {
    rememberFirstRegistration(A_CONCERT, A_REGISTRATION);
    expect(readStoredRegistration(A_CONCERT)).toStrictEqual(A_REGISTRATION);
    expect(readStoredRegistration(ANOTHER_CONCERT)).toBeNull();
    expect(localStorage.getItem(`pragma.registration.${A_CONCERT}`)).not.toBeNull();
  });

  it('keeps the first registration of a concert when a friend signs up from the same browser', () => {
    rememberFirstRegistration(A_CONCERT, A_REGISTRATION);
    rememberFirstRegistration(A_CONCERT, { registrationId: 'friend', editToken: 'token-2' });
    expect(readStoredRegistration(A_CONCERT)).toStrictEqual(A_REGISTRATION);
  });

  it.each([
    ['text that is not JSON', 'not json'],
    ['JSON of another shape', JSON.stringify({ registrationId: 'registration-1' })],
  ])('forgets %s rather than trusting it', (_label, raw) => {
    localStorage.setItem(`pragma.registration.${A_CONCERT}`, raw);
    expect(readStoredRegistration(A_CONCERT)).toBeNull();
  });
});
