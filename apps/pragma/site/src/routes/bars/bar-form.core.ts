/**
 * Bar form vocabulary and the pure translation from the form's string
 * fields to the payload the bars API accepts. The form keeps every
 * field as a string so the inputs stay controlled; this module is the
 * single place that turns those strings back into the domain types.
 */

import { z } from 'zod';

export const BAR_STATUSES = ['lead', 'contacted', 'booked', 'played', 'cold'] as const;

export type BarStatus = (typeof BAR_STATUSES)[number];

export const BAR_STATUS_KEY = {
  lead: 'bars.statusLead',
  contacted: 'bars.statusContacted',
  booked: 'bars.statusBooked',
  played: 'bars.statusPlayed',
  cold: 'bars.statusCold',
} as const satisfies Record<BarStatus, string>;

export const BAR_NAME_MAX_LENGTH = 256;
export const BAR_NOTES_MAX_LENGTH = 4_096;
const BAR_FIELD_MAX_LENGTH = 256;

export const barFormValuesSchema = z.object({
  name: z.string().trim().min(1).max(BAR_NAME_MAX_LENGTH),
  status: z.enum(BAR_STATUSES),
  notes: z.string().max(BAR_NOTES_MAX_LENGTH),
  city: z.string().max(BAR_FIELD_MAX_LENGTH),
  capacity: z.string().regex(/^\d*$/u),
  contactName: z.string().max(BAR_FIELD_MAX_LENGTH),
  contactEmail: z.string().max(BAR_FIELD_MAX_LENGTH),
  contactPhone: z.string().max(BAR_FIELD_MAX_LENGTH),
});

export type BarFormValues = z.infer<typeof barFormValuesSchema>;

export interface BarFormSubmitPayload {
  readonly name: string;
  readonly status: BarStatus;
  readonly notes: string;
  readonly city: string | null;
  readonly capacity: number | null;
  readonly contactName: string | null;
  readonly contactEmail: string | null;
  readonly contactPhone: string | null;
}

export interface BarFormInitial {
  readonly id: string | null;
  readonly name: string;
  readonly status: BarStatus;
  readonly notes: string;
  readonly city: string;
  readonly capacity: string;
  readonly contactName: string;
  readonly contactEmail: string;
  readonly contactPhone: string;
}

export const BLANK_BAR_FORM: BarFormInitial = {
  id: null,
  name: '',
  status: 'lead',
  notes: '',
  city: '',
  capacity: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
};

/** An empty text field means "no value", which the API reads as `null`. */
function emptyToNull(value: string): string | null {
  return value.length === 0 ? null : value;
}

// @FollowsBlueprint core-form-schema
export function buildBarPayloadFromFormValues(values: BarFormValues): BarFormSubmitPayload {
  const capacity = emptyToNull(values.capacity);
  return {
    name: values.name.trim(),
    status: values.status,
    notes: values.notes,
    city: emptyToNull(values.city),
    capacity: capacity === null ? null : Number(capacity),
    contactName: emptyToNull(values.contactName),
    contactEmail: emptyToNull(values.contactEmail),
    contactPhone: emptyToNull(values.contactPhone),
  };
}

export function buildBarFormInitial(bar: {
  readonly id: string;
  readonly name: string;
  readonly status: BarStatus;
  readonly notes: string;
  readonly city: string | null;
  readonly capacity: number | null;
  readonly contactName: string | null;
  readonly contactEmail: string | null;
  readonly contactPhone: string | null;
}): BarFormInitial {
  return {
    id: bar.id,
    name: bar.name,
    status: bar.status,
    notes: bar.notes,
    city: bar.city ?? '',
    capacity: bar.capacity === null ? '' : String(bar.capacity),
    contactName: bar.contactName ?? '',
    contactEmail: bar.contactEmail ?? '',
    contactPhone: bar.contactPhone ?? '',
  };
}

export type BarFormTitleKind = 'new' | 'existing';

export function selectBarFormTitleKind(initial: BarFormInitial): BarFormTitleKind {
  return initial.id === null ? 'new' : 'existing';
}

export function parseBarStatus(candidate: string): BarStatus | null {
  const parsed = z.enum(BAR_STATUSES).safeParse(candidate);
  return parsed.success ? parsed.data : null;
}
