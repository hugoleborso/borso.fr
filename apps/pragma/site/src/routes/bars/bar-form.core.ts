/** @Feature bars */

import { z } from 'zod';

export const BAR_STATUSES = ['lead', 'contacted', 'booked', 'played', 'cold'] as const;

export type BarStatus = (typeof BAR_STATUSES)[number];

export const CONCERT_MOODS = ['chill', 'gig', 'ticketed'] as const;
export const AVAILABLE_SUPPORTS = ['pa-system', 'lights', 'sound-engineer'] as const;

export type ConcertMood = (typeof CONCERT_MOODS)[number];
export type AvailableSupport = (typeof AVAILABLE_SUPPORTS)[number];

export const CONCERT_MOOD_KEY = {
  chill: 'bars.moodChill',
  gig: 'bars.moodGig',
  ticketed: 'bars.moodTicketed',
} as const satisfies Record<ConcertMood, string>;

export const AVAILABLE_SUPPORT_KEY = {
  'pa-system': 'bars.supportPaSystem',
  lights: 'bars.supportLights',
  'sound-engineer': 'bars.supportSoundEngineer',
} as const satisfies Record<AvailableSupport, string>;

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
  ownerMemberId: z.string(),
  concertMood: z.union([z.enum(CONCERT_MOODS), z.literal('')]),
  availableSupport: z.array(z.enum(AVAILABLE_SUPPORTS)),
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
  readonly ownerMemberId: string | null;
  readonly concertMood: ConcertMood | null;
  readonly availableSupport: AvailableSupport[];
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
  readonly ownerMemberId: string;
  readonly concertMood: ConcertMood | '';
  readonly availableSupport: readonly AvailableSupport[];
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
  ownerMemberId: '',
  concertMood: '',
  availableSupport: [],
};

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
    ownerMemberId: emptyToNull(values.ownerMemberId),
    concertMood: values.concertMood === '' ? null : values.concertMood,
    availableSupport: values.availableSupport,
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
  readonly ownerMemberId: string | null;
  readonly concertMood: ConcertMood | null;
  readonly availableSupport: readonly AvailableSupport[];
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
    ownerMemberId: bar.ownerMemberId ?? '',
    concertMood: bar.concertMood ?? '',
    availableSupport: bar.availableSupport,
  };
}

export interface BarPlacePick {
  readonly name: string;
  readonly city: string | null;
  readonly phone: string | null;
}

export function buildBarFormFromPlace(pick: BarPlacePick, blank: BarFormInitial): BarFormInitial {
  return {
    ...blank,
    id: null,
    name: pick.name,
    city: pick.city ?? '',
    contactPhone: pick.phone ?? '',
  };
}

export type BarFormTitleKind = 'new' | 'existing';

export function selectBarFormTitleKind(initial: BarFormInitial): BarFormTitleKind {
  return initial.id === null ? 'new' : 'existing';
}

export function toggleSupport(
  current: readonly AvailableSupport[],
  support: AvailableSupport,
): AvailableSupport[] {
  const isHeld = current.includes(support);
  const kept = current.filter((candidate) => candidate !== support);
  return isHeld
    ? kept
    : AVAILABLE_SUPPORTS.filter((candidate) => [...kept, support].includes(candidate));
}

export function parseConcertMood(candidate: string): ConcertMood | '' | null {
  if (candidate === '') return '';
  const mood = z.enum(CONCERT_MOODS).safeParse(candidate);
  return mood.success ? mood.data : null;
}

export function parseBarStatus(candidate: string): BarStatus | null {
  const status = z.enum(BAR_STATUSES).safeParse(candidate);
  return status.success ? status.data : null;
}
