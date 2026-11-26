import { isValid as isDeliverableMailbox } from 'mailchecker';
import normalizeEmail from 'validator/lib/normalizeEmail';

const DOMAIN_SEPARATOR = '@';
const TAG_SEPARATOR = '+';
const NOT_FOUND = -1;

function dropTag(localPart: string): string {
  const tagIndex = localPart.indexOf(TAG_SEPARATOR);
  return tagIndex === NOT_FOUND ? localPart : localPart.slice(0, tagIndex);
}

function dropTagOnAnyDomain(email: string): string {
  const domainIndex = email.lastIndexOf(DOMAIN_SEPARATOR);
  const localPart = dropTag(email.slice(0, domainIndex));
  return localPart === '' ? email : `${localPart}${email.slice(domainIndex)}`;
}

// @FollowsBlueprint core-decision
export function canonicalizeEmail(email: string): string {
  const typed = email.trim().toLowerCase();
  const normalized = normalizeEmail(typed);
  return dropTagOnAnyDomain(normalized === false ? typed : normalized);
}

export function isDisposableEmail(email: string): boolean {
  return !isDeliverableMailbox(email.trim());
}
