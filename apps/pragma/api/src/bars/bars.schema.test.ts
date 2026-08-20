import { describe, expect, it } from 'vitest';
import { barCreateSchema, barIdParamSchema, barUpdateSchema } from './bars.schema';

function bar(overrides: Record<string, unknown> = {}): unknown {
  return { name: 'Le Trabendo', status: 'lead', ...overrides };
}

describe('barCreateSchema', () => {
  it('needs only a name and a status, and fills the rest in', () => {
    expect(barCreateSchema.parse(bar())).toMatchObject({
      notes: '',
      lastInteractionAt: null,
      city: null,
      capacity: null,
      contactName: null,
      contactEmail: null,
      contactPhone: null,
    });
  });

  it('trims the name and refuses whitespace alone', () => {
    expect(barCreateSchema.parse(bar({ name: '  Le Trabendo  ' })).name).toBe('Le Trabendo');
    expect(barCreateSchema.safeParse(bar({ name: '   ' })).success).toBe(false);
  });

  it('accepts every status in the booking pipeline and nothing else', () => {
    for (const status of ['lead', 'contacted', 'booked', 'played', 'cold']) {
      expect(barCreateSchema.safeParse(bar({ status })).success).toBe(true);
    }
    expect(barCreateSchema.safeParse(bar({ status: 'maybe' })).success).toBe(false);
  });

  it('accepts null for a field the operator has not filled yet', () => {
    expect(barCreateSchema.safeParse(bar({ city: null, capacity: null })).success).toBe(true);
  });

  it('refuses a capacity that is negative, fractional, or larger than any room', () => {
    for (const capacity of [-1, 12.5, 100_001]) {
      expect(barCreateSchema.safeParse(bar({ capacity })).success).toBe(false);
    }
    expect(barCreateSchema.safeParse(bar({ capacity: 0 })).success).toBe(true);
  });

  it('refuses a contact address that is not an address', () => {
    expect(barCreateSchema.safeParse(bar({ contactEmail: 'booking' })).success).toBe(false);
    expect(barCreateSchema.safeParse(bar({ contactEmail: 'booking@venue.fr' })).success).toBe(true);
  });

  it('refuses a last interaction that is not a timestamp', () => {
    expect(barCreateSchema.safeParse(bar({ lastInteractionAt: '2026-08-15' })).success).toBe(false);
    expect(
      barCreateSchema.safeParse(bar({ lastInteractionAt: '2026-08-15T10:00:00.000Z' })).success,
    ).toBe(true);
  });
});

describe('barUpdateSchema', () => {
  it('accepts a patch with nothing in it', () => {
    expect(barUpdateSchema.safeParse({}).success).toBe(true);
  });

  it('still applies the create rules to whichever field is present', () => {
    expect(barUpdateSchema.safeParse({ status: 'maybe' }).success).toBe(false);
    expect(barUpdateSchema.safeParse({ name: '  ' }).success).toBe(false);
  });
});

describe('barIdParamSchema', () => {
  it('accepts a uuid and refuses anything else', () => {
    expect(barIdParamSchema.safeParse({ id: crypto.randomUUID() }).success).toBe(true);
    expect(barIdParamSchema.safeParse({ id: 'bar-1' }).success).toBe(false);
  });
});
