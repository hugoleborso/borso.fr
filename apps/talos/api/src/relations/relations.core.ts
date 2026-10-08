import { z } from 'zod';
import { countDaysBetween } from '../helpers/calendar/paris-clock.utils';
import { parseJsonOrNull } from '../helpers/json/json.core';

export interface PersonToReconnect {
  readonly page: string;
  readonly title: string;
  readonly closeness: number | null;
  readonly lastContactOn: string | null;
  readonly silentDays: number;
}

export interface UpcomingBirthday {
  readonly page: string;
  readonly title: string;
  readonly date: string;
  readonly daysUntil: number;
  readonly age: number | null;
}

export interface RelationsDigest {
  readonly generatedAt: string | null;
  readonly toReconnect: PersonToReconnect[];
  readonly birthdays: UpcomingBirthday[];
}

export const SOON_BIRTHDAY_HORIZON_DAYS = 3;

const ISO_DAY_PATTERN = /^\d{4}-\d{2}-\d{2}/;
const ISO_DAY_LENGTH = 10;
const TITLE_FIELD = 'titre';

const relationsFileSchema = z.object({
  genere: z.string().regex(ISO_DAY_PATTERN),
  a_recontacter: z.array(z.unknown()).optional(),
  anniversaires: z.array(z.unknown()).optional(),
});

const personToReconnectSchema = z.object({
  page: z.string().min(1),
  [TITLE_FIELD]: z.string().min(1),
  proximite: z.number().nullish(),
  dernier_contact: z.string().nullish(),
  jours: z.number().int(),
});

const upcomingBirthdaySchema = z.object({
  page: z.string().min(1),
  [TITLE_FIELD]: z.string().min(1),
  date: z.string().regex(ISO_DAY_PATTERN),
  dans_jours: z.number().int(),
  age: z.number().int().nullish(),
});

const EMPTY_RELATIONS: RelationsDigest = { generatedAt: null, toReconnect: [], birthdays: [] };

function readPersonToReconnect(entry: unknown, elapsedDays: number): PersonToReconnect | null {
  const personEntry = personToReconnectSchema.safeParse(entry);
  if (!personEntry.success) return null;
  const { page, proximite, dernier_contact: lastContactOn, jours } = personEntry.data;
  return {
    page,
    title: personEntry.data[TITLE_FIELD],
    closeness: proximite ?? null,
    lastContactOn: lastContactOn ?? null,
    silentDays: jours + elapsedDays,
  };
}

function readUpcomingBirthday(entry: unknown, elapsedDays: number): UpcomingBirthday | null {
  const birthdayEntry = upcomingBirthdaySchema.safeParse(entry);
  if (!birthdayEntry.success) return null;
  const { page, date, dans_jours: daysUntil, age } = birthdayEntry.data;
  return {
    page,
    title: birthdayEntry.data[TITLE_FIELD],
    date: date.slice(0, ISO_DAY_LENGTH),
    daysUntil: daysUntil - elapsedDays,
    age: age ?? null,
  };
}

function measureElapsedDays(generatedAt: string, today: string): number {
  const elapsed = countDaysBetween(generatedAt.slice(0, ISO_DAY_LENGTH), today);
  return Number.isNaN(elapsed) ? 0 : Math.max(0, elapsed);
}

// @FollowsBlueprint core-parse-untrusted
export function parseRelations(raw: string | null, today: string): RelationsDigest {
  // Stryker disable next-line ConditionalExpression: equivalent mutant, a missing file parses to null and fails the schema below exactly like this early answer.
  if (raw === null) return EMPTY_RELATIONS;
  const relationsFile = relationsFileSchema.safeParse(parseJsonOrNull(raw));
  if (!relationsFile.success) return EMPTY_RELATIONS;
  // Stryker disable next-line ArrayDeclaration: equivalent mutant, an entry the schemas cannot read is skipped, so a filled fallback reads exactly like the empty one.
  const {
    genere,
    a_recontacter: toReconnect = [],
    anniversaires: birthdays = [],
  } = relationsFile.data;
  const elapsedDays = measureElapsedDays(genere, today);
  return {
    generatedAt: genere,
    toReconnect: toReconnect
      .map((entry) => readPersonToReconnect(entry, elapsedDays))
      .filter((person) => person !== null),
    birthdays: birthdays
      .map((entry) => readUpcomingBirthday(entry, elapsedDays))
      .filter((birthday) => birthday !== null)
      .filter((birthday) => birthday.daysUntil >= 0),
  };
}

export function selectSoonBirthdays(birthdays: readonly UpcomingBirthday[]): UpcomingBirthday[] {
  return birthdays.filter((birthday) => birthday.daysUntil <= SOON_BIRTHDAY_HORIZON_DAYS);
}
