import { describe, expect, it } from 'vitest';
import {
  OUTREACH_PLACEHOLDERS,
  renderOutreachMessage,
  selectOutreachTemplate,
} from './outreach-message.core';

const TEMPLATE = `Hey ${OUTREACH_PLACEHOLDERS.bar}, we play. Contact: ${OUTREACH_PLACEHOLDERS.phone} - ${OUTREACH_PLACEHOLDERS.email}`;

// @FollowsBlueprint test-pure-unit
describe('renderOutreachMessage', () => {
  it('names the bar and signs with the member contact details', () => {
    expect(
      renderOutreachMessage(TEMPLATE, {
        barName: 'Le Zinc',
        phone: '0601020304',
        email: 'ada@example.com',
      }),
    ).toBe('Hey Le Zinc, we play. Contact: 0601020304 - ada@example.com');
  });

  it('replaces the bar placeholder everywhere it appears', () => {
    const repeated = `${OUTREACH_PLACEHOLDERS.bar} and ${OUTREACH_PLACEHOLDERS.bar}`;
    expect(renderOutreachMessage(repeated, { barName: 'X', phone: null, email: null })).toBe(
      'X and X',
    );
  });

  it('marks a contact detail the member has not filled in', () => {
    const rendered = renderOutreachMessage(TEMPLATE, {
      barName: 'Le Zinc',
      phone: null,
      email: '',
    });
    expect(rendered).toBe('Hey Le Zinc, we play. Contact: … - …');
  });
});

describe('selectOutreachTemplate', () => {
  it('prefers the saved template', () => {
    expect(selectOutreachTemplate('saved', 'fallback')).toBe('saved');
  });

  it('falls back when nothing was ever saved', () => {
    expect(selectOutreachTemplate(null, 'fallback')).toBe('fallback');
  });

  it('falls back on an empty saved template', () => {
    expect(selectOutreachTemplate('', 'fallback')).toBe('fallback');
  });
});
