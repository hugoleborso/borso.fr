import { describe, expect, it } from 'vitest';
import { parseRelations, selectSoonBirthdays } from './relations.core';

const TITLE_FIELD = 'titre';
const GENERATED_AT = '2026-10-08T03:03:00+02:00';

function relationsFile(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    genere: GENERATED_AT,
    a_recontacter: [
      {
        page: 'second-brain/personnes/alice-martin',
        [TITLE_FIELD]: 'Alice Martin',
        proximite: 5,
        dernier_contact: '2026-08-29',
        jours: 40,
      },
      { page: 'second-brain/personnes/bruno', [TITLE_FIELD]: 'Bruno', jours: 12 },
    ],
    anniversaires: [
      {
        page: 'second-brain/personnes/claire',
        [TITLE_FIELD]: 'Claire',
        date: '2026-10-08',
        dans_jours: 0,
        age: 34,
      },
      {
        page: 'second-brain/personnes/denis',
        [TITLE_FIELD]: 'Denis',
        date: '2026-10-20T00:00:00+02:00',
        dans_jours: 12,
        age: null,
      },
    ],
    ...overrides,
  });
}

describe('parseRelations', () => {
  it('reads the people to reconnect with and the birthdays on the day the file was written', () => {
    expect(parseRelations(relationsFile(), '2026-10-08')).toStrictEqual({
      generatedAt: GENERATED_AT,
      toReconnect: [
        {
          page: 'second-brain/personnes/alice-martin',
          title: 'Alice Martin',
          closeness: 5,
          lastContactOn: '2026-08-29',
          silentDays: 40,
        },
        {
          page: 'second-brain/personnes/bruno',
          title: 'Bruno',
          closeness: null,
          lastContactOn: null,
          silentDays: 12,
        },
      ],
      birthdays: [
        {
          page: 'second-brain/personnes/claire',
          title: 'Claire',
          date: '2026-10-08',
          daysUntil: 0,
          age: 34,
        },
        {
          page: 'second-brain/personnes/denis',
          title: 'Denis',
          date: '2026-10-20',
          daysUntil: 12,
          age: null,
        },
      ],
    });
  });

  it('moves the counts to today when the file dates from an earlier day, dropping past birthdays', () => {
    const digest = parseRelations(relationsFile(), '2026-10-10');
    expect(digest.toReconnect.map((person) => person.silentDays)).toEqual([42, 14]);
    expect(digest.birthdays).toStrictEqual([
      {
        page: 'second-brain/personnes/denis',
        title: 'Denis',
        date: '2026-10-20',
        daysUntil: 10,
        age: null,
      },
    ]);
  });

  it('never counts backwards when the file looks written after today', () => {
    const digest = parseRelations(relationsFile(), '2026-10-07');
    expect(digest.toReconnect.map((person) => person.silentDays)).toEqual([40, 12]);
    expect(digest.birthdays.map((birthday) => birthday.daysUntil)).toEqual([0, 12]);
  });

  it('keeps the counts as written when the generation date is not a real day', () => {
    const digest = parseRelations(relationsFile({ genere: '2026-13-45T00:00:00Z' }), '2026-10-10');
    expect(digest.toReconnect.map((person) => person.silentDays)).toEqual([40, 12]);
  });

  it('skips the entries it cannot read and accepts missing lists', () => {
    const digest = parseRelations(
      relationsFile({
        a_recontacter: [{ page: 'x', [TITLE_FIELD]: 'X' }, 'texte'],
        anniversaires: [{ page: 'y', [TITLE_FIELD]: 'Y', date: 'bientôt', dans_jours: 2 }],
      }),
      '2026-10-08',
    );
    expect(digest).toStrictEqual({ generatedAt: GENERATED_AT, toReconnect: [], birthdays: [] });
    expect(parseRelations(JSON.stringify({ genere: GENERATED_AT }), '2026-10-08')).toStrictEqual({
      generatedAt: GENERATED_AT,
      toReconnect: [],
      birthdays: [],
    });
  });

  it('answers nothing to show for a missing, unreadable or undated file', () => {
    const empty = { generatedAt: null, toReconnect: [], birthdays: [] };
    expect(parseRelations(null, '2026-10-08')).toStrictEqual(empty);
    expect(parseRelations('{', '2026-10-08')).toStrictEqual(empty);
    expect(parseRelations(relationsFile({ genere: 'hier' }), '2026-10-08')).toStrictEqual(empty);
  });
});

function birthdayIn(daysUntil: number) {
  return { page: `p/${String(daysUntil)}`, title: 't', date: '2026-10-08', daysUntil, age: null };
}

describe('selectSoonBirthdays', () => {
  it('keeps the birthdays three days away or closer', () => {
    expect(
      selectSoonBirthdays([birthdayIn(0), birthdayIn(3), birthdayIn(4)]).map(
        (entry) => entry.daysUntil,
      ),
    ).toEqual([0, 3]);
  });
});
