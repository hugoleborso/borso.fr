import { describe, expect, it } from 'vitest';
import { canonicalizeEmail, isDisposableEmail } from './registration-email.core';

// @FollowsBlueprint test-pure-unit
describe('canonicalizeEmail', () => {
  it('trims and lower-cases an address', () => {
    expect(canonicalizeEmail('  Lou@Free.FR ')).toBe('lou@free.fr');
  });

  it('drops the +tag of the local part on every domain', () => {
    expect(canonicalizeEmail('a+x@free.fr')).toBe('a@free.fr');
    expect(canonicalizeEmail('a+x+y@free.fr')).toBe('a@free.fr');
  });

  it('keeps the dots outside Gmail, where they name another mailbox', () => {
    expect(canonicalizeEmail('a.b@free.fr')).toBe('a.b@free.fr');
  });

  it('removes the dots on Gmail and folds googlemail.com onto gmail.com', () => {
    expect(canonicalizeEmail('jean.dupont+bieres@gmail.com')).toBe('jeandupont@gmail.com');
    expect(canonicalizeEmail('Jean.Dupont@GoogleMail.com')).toBe('jeandupont@gmail.com');
  });

  it('drops the subaddress the big providers use, as validator does by default', () => {
    expect(canonicalizeEmail('x+y@outlook.com')).toBe('x@outlook.com');
    expect(canonicalizeEmail('x-y@yahoo.com')).toBe('x@yahoo.com');
  });

  it('keeps the typed address when dropping the tag would leave no local part', () => {
    expect(canonicalizeEmail('+bieres@Gmail.com')).toBe('+bieres@gmail.com');
    expect(canonicalizeEmail('+a@free.fr')).not.toBe(canonicalizeEmail('+b@free.fr'));
  });
});

describe('isDisposableEmail', () => {
  it('refuses a throwaway mailbox and accepts an ordinary one', () => {
    expect(isDisposableEmail('x@yopmail.com')).toBe(true);
    expect(isDisposableEmail(' a@free.fr ')).toBe(false);
  });
});
