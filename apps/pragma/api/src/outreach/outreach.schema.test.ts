import { describe, expect, it } from 'vitest';
import { OUTREACH_TEMPLATE_ROW_ID, outreachTemplateSaveSchema } from './outreach.schema';

describe('outreachTemplateSaveSchema', () => {
  it('trims the body it accepts', () => {
    expect(outreachTemplateSaveSchema.parse({ body: '  Hey {{bar}}  ' }).body).toBe('Hey {{bar}}');
  });

  it('refuses a body that is empty or whitespace alone', () => {
    for (const body of ['', '   ']) {
      expect(outreachTemplateSaveSchema.safeParse({ body }).success).toBe(false);
    }
  });

  it('refuses a body longer than the column is meant to hold', () => {
    expect(outreachTemplateSaveSchema.safeParse({ body: 'a'.repeat(4_097) }).success).toBe(false);
  });
});

describe('OUTREACH_TEMPLATE_ROW_ID', () => {
  it('names the single row the table holds', () => {
    expect(OUTREACH_TEMPLATE_ROW_ID).toBe(1);
  });
});
