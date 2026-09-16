/** @Feature bars */

export const OUTREACH_PLACEHOLDERS = {
  bar: '{{bar}}',
  phone: '{{phone}}',
  email: '{{email}}',
} as const;

export interface OutreachSignature {
  readonly barName: string;
  readonly phone: string | null;
  readonly email: string | null;
}

const MISSING_CONTACT_MARK = '…';

function contactOrMark(value: string | null): string {
  return value === null || value.length === 0 ? MISSING_CONTACT_MARK : value;
}

/**
 * @Blueprint core-template-rendering
 * @BlueprintName Core Template Rendering
 * @BlueprintUsage Use for turning a stored template and a record into the text a person reads, so the component only copies what this returns.
 * @BlueprintDescription Replaces each named placeholder with the value it stands for, everywhere it appears, and falls back to a visible mark for a contact detail the member has not filled in yet, so the gap is obvious in the copied message rather than silently empty. The function is pure, so a test states the substitution directly and no clipboard is involved.
 */
export function renderOutreachMessage(template: string, signature: OutreachSignature): string {
  return template
    .split(OUTREACH_PLACEHOLDERS.bar)
    .join(signature.barName)
    .split(OUTREACH_PLACEHOLDERS.phone)
    .join(contactOrMark(signature.phone))
    .split(OUTREACH_PLACEHOLDERS.email)
    .join(contactOrMark(signature.email));
}

export function selectOutreachTemplate(saved: string | null, fallback: string): string {
  return saved === null || saved.length === 0 ? fallback : saved;
}
