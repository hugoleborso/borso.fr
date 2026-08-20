import { z } from 'zod';
import type { CreateEditionVariables, ReplaceEditionVariables } from '../../lib/queries/editions';
import type { RaceEditionDto } from '../../lib/race.types';
import { defaultEndsAt, defaultStartsAt, isoLocal, suggestNextSlug } from './setup-form.utils';

const SLUG_PATTERN = /^[a-z0-9-]+$/;
const MINIMUM_SLUG_LENGTH = 3;
const MAXIMUM_SLUG_LENGTH = 64;
const MAXIMUM_NAME_LENGTH = 120;
const MINIMUM_INTERVAL_MINUTES = 1;
const MAXIMUM_INTERVAL_MINUTES = 240;
export const DEFAULT_INTERVAL_MINUTES = 60;

export const DEFAULT_EDITION_NAME = 'Last Loop Lépin';

export interface EditionFormValues {
  readonly slug: string;
  readonly displayName: string;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly intervalMinutes: string;
}

/**
 * @Blueprint core-form-schema
 * @BlueprintName Core Form Schema And Payload
 * @BlueprintUsage Use for the validation, the starting values and the request body of a form, kept out of the component that renders it.
 * @BlueprintDescription Declares the Zod schema the form's `validators` wrap, beside `buildCreateFormDefaults` and `buildEditFormDefaults` for the starting values and `buildCreateEditionPayload` and `buildReplaceEditionPayload` for the request bodies. All of it is pure, so the module carries the full coverage gate and two components share one contract. The schema restates the back end's input schema rather than importing it, because that file also declares the Drizzle tables, and the header says so.
 */
export const editionFormValuesSchema = z.object({
  slug: z
    .string()
    .min(MINIMUM_SLUG_LENGTH)
    .max(MAXIMUM_SLUG_LENGTH)
    .regex(SLUG_PATTERN, 'lowercase letters, digits and dashes only'),
  displayName: z.string().min(1).max(MAXIMUM_NAME_LENGTH),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
  intervalMinutes: z.string().refine(
    (raw) => {
      const asNumber = Number.parseInt(raw, 10);
      return (
        Number.isInteger(asNumber) &&
        asNumber >= MINIMUM_INTERVAL_MINUTES &&
        asNumber <= MAXIMUM_INTERVAL_MINUTES
      );
    },
    { message: 'interval-out-of-range' },
  ),
});

export function readIntervalMinutes(raw: string): number {
  const asNumber = Number.parseInt(raw, 10);
  if (!Number.isFinite(asNumber)) return DEFAULT_INTERVAL_MINUTES;
  return asNumber;
}

function buildBasePayload(values: EditionFormValues) {
  return {
    displayName: values.displayName,
    startsAt: new Date(values.startsAt).toISOString(),
    endsAt: new Date(values.endsAt).toISOString(),
    intervalMinutes: readIntervalMinutes(values.intervalMinutes),
  };
}

export function buildCreateEditionPayload(
  values: EditionFormValues,
  gpxXml: string,
): CreateEditionVariables {
  return { slug: values.slug, ...buildBasePayload(values), gpxXml };
}

export function buildReplaceEditionPayload(
  slug: string,
  values: EditionFormValues,
  gpxXml: string | null,
): ReplaceEditionVariables {
  const base = { slug, ...buildBasePayload(values) };
  if (gpxXml === null) return base;
  return { ...base, gpxXml };
}

export function buildEditFormDefaults(edition: RaceEditionDto): EditionFormValues {
  return {
    slug: edition.slug,
    displayName: edition.displayName,
    startsAt: isoLocal(new Date(edition.startsAt)),
    endsAt: isoLocal(new Date(edition.endsAt)),
    intervalMinutes: `${edition.intervalMinutes}`,
  };
}

export function buildCreateFormDefaults(
  currentEdition: RaceEditionDto | null,
  now: Date,
): EditionFormValues {
  return {
    slug: suggestNextSlug(currentEdition?.slug),
    displayName: DEFAULT_EDITION_NAME,
    startsAt: defaultStartsAt(now),
    endsAt: defaultEndsAt(now),
    intervalMinutes: `${DEFAULT_INTERVAL_MINUTES}`,
  };
}

export type EditionStatusTransition = 'setup' | 'live' | 'finished';

const NEXT_TRANSITION_BY_STATUS = {
  setup: 'live',
  live: 'finished',
  finished: 'setup',
} as const;

export function selectNextTransition(edition: RaceEditionDto): EditionStatusTransition {
  return NEXT_TRANSITION_BY_STATUS[edition.status];
}

export function selectEditableEdition(edition: RaceEditionDto | null): RaceEditionDto | null {
  if (edition === null) return null;
  if (edition.status !== 'setup') return null;
  return edition;
}

export function selectStartedEdition(edition: RaceEditionDto | null): RaceEditionDto | null {
  if (edition === null) return null;
  if (edition.status === 'setup') return null;
  return edition;
}

export function selectCreateFormTitleKey(
  edition: RaceEditionDto | null,
): 'admin.setup.create-title' | 'admin.setup.create-another-title' {
  if (edition === null) return 'admin.setup.create-title';
  return 'admin.setup.create-another-title';
}

export function selectCreateFormHintKey(
  edition: RaceEditionDto | null,
): 'admin.setup.hint-initial' | 'admin.setup.hint-different-slug' {
  if (edition === null) return 'admin.setup.hint-initial';
  return 'admin.setup.hint-different-slug';
}
