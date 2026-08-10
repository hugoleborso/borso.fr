/**
 * The edition setup form's rules: the field vocabulary, its validation, and
 * the translation from form values to the payload the API takes.
 *
 * The Zod schema mirrors `createEditionInputSchema` in
 * `api/src/edition/edition.schema.ts`. It is restated rather than imported
 * because that file also declares the Drizzle table, which has no business in
 * a browser bundle, and because the form holds wall time strings from a
 * `datetime-local` input where the API takes offset carrying timestamps.
 */

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
      const parsed = Number.parseInt(raw, 10);
      return (
        Number.isInteger(parsed) &&
        parsed >= MINIMUM_INTERVAL_MINUTES &&
        parsed <= MAXIMUM_INTERVAL_MINUTES
      );
    },
    { message: 'interval-out-of-range' },
  ),
});

export function readIntervalMinutes(raw: string): number {
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_INTERVAL_MINUTES;
  return parsed;
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

/**
 * The update payload. A missing GPX means "keep the persisted track", which
 * is what an empty file picker stands for while editing.
 */
export function buildReplaceEditionPayload(
  slug: string,
  values: EditionFormValues,
  gpxXml: string | null,
): ReplaceEditionVariables {
  const base = { slug, ...buildBasePayload(values) };
  if (gpxXml === null) return base;
  return { ...base, gpxXml };
}

/** Field values the edit form starts from, for the edition being edited. */
export function buildEditFormDefaults(edition: RaceEditionDto): EditionFormValues {
  return {
    slug: edition.slug,
    displayName: edition.displayName,
    startsAt: isoLocal(new Date(edition.startsAt)),
    endsAt: isoLocal(new Date(edition.endsAt)),
    intervalMinutes: `${edition.intervalMinutes}`,
  };
}

/** Field values the create form starts from, suggested from what exists. */
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

/** The single status button that fits an edition, e.g. live goes to finished. */
export function selectNextTransition(edition: RaceEditionDto): EditionStatusTransition {
  return NEXT_TRANSITION_BY_STATUS[edition.status];
}

/** The edition the setup tab lets the operator edit, if there is one. */
export function selectEditableEdition(edition: RaceEditionDto | null): RaceEditionDto | null {
  if (edition === null) return null;
  if (edition.status !== 'setup') return null;
  return edition;
}

/** The edition the setup tab shows read only, if there is one. */
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
