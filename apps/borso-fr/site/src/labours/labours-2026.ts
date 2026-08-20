import type { Edition } from './labours.types';

/**
 * @Blueprint data-module
 * @BlueprintName Hand Edited Data Module
 * @BlueprintUsage Use for content a person edits and ships in a pull request, where there is no database and no content service behind the page.
 * @BlueprintDescription Declares the whole edition as one literal annotated with the domain type, so a wrong status or a missing field is a typecheck failure at the point of editing. Every string a reader sees is a `TranslationKey` rather than text, so the catalogue stays the only place copy lives and a key removed from `en.json` breaks the build here instead of rendering raw on the page.
 */
export const EDITION_2026: Edition = {
  titleKey: 'twelve-labours.edition.2026.title',
  subtitleKey: 'twelve-labours.edition.2026.subtitle',
  months: [
    {
      monthNumber: 1,
      nameKey: 'common.month.january',
      challenges: [
        {
          titleKey: 'twelve-labours.edition.2026.january.positivity.title',
          kind: 'daily',
          status: 'done',
        },
        {
          titleKey: 'twelve-labours.edition.2026.january.daily-sport.title',
          kind: 'daily',
          status: 'done',
          proofs: [
            { type: 'stat', value: '31', labelKey: 'twelve-labours.proof-label.days' },
            { type: 'stat', value: '26h', labelKey: 'twelve-labours.proof-label.time' },
            { type: 'stat', value: '196,9 km', labelKey: 'twelve-labours.proof-label.distance' },
            { type: 'stat', value: '1 165 m', labelKey: 'twelve-labours.proof-label.elevation' },
            { type: 'photo', value: '/media/12-travaux/janvier-2026-sport-strava.png' },
          ],
        },
      ],
    },
    {
      monthNumber: 2,
      nameKey: 'common.month.february',
      challenges: [
        {
          titleKey: 'twelve-labours.edition.2026.february.early-nights.title',
          kind: 'daily',
          status: 'partial',
          noteKey: 'twelve-labours.edition.2026.february.early-nights.note',
          proofs: [
            { type: 'photo', value: '/media/12-travaux/fevrier-2026-nuit-1.jpg' },
            { type: 'photo', value: '/media/12-travaux/fevrier-2026-nuit-2.jpg' },
          ],
        },
        {
          titleKey: 'twelve-labours.edition.2026.february.pragma-dates.title',
          kind: 'oneshot',
          status: 'abandoned',
          noteKey: 'twelve-labours.edition.2026.february.pragma-dates.note',
        },
        {
          titleKey: 'twelve-labours.edition.2026.february.ten-hours-of-sport.title',
          kind: 'oneshot',
          status: 'done',
          noteKey: 'twelve-labours.edition.2026.february.ten-hours-of-sport.note',
        },
      ],
    },
    {
      monthNumber: 3,
      nameKey: 'common.month.march',
      challenges: [
        {
          titleKey: 'twelve-labours.edition.2026.march.capes-maths.title',
          kind: 'oneshot',
          status: 'done',
        },
        {
          titleKey: 'twelve-labours.edition.2026.march.beat-the-metro.title',
          kind: 'oneshot',
          status: 'done',
          noteKey: 'twelve-labours.edition.2026.march.beat-the-metro.note',
        },
        {
          titleKey: 'twelve-labours.edition.2026.march.weekly-strength.title',
          kind: 'daily',
          status: 'abandoned',
        },
      ],
    },
    {
      monthNumber: 4,
      nameKey: 'common.month.april',
      coverImage: '/media/12-travaux/avril-2026-carte.jpg',
      challenges: [
        {
          titleKey: 'twelve-labours.edition.2026.april.metro-lines.title',
          kind: 'daily',
          status: 'done',
          noteKey: 'twelve-labours.edition.2026.april.metro-lines.note',
          proofs: [
            {
              type: 'stat',
              value: '263 km',
              labelKey: 'twelve-labours.proof-label.total-distance',
            },
            { type: 'stat', value: '24h51', labelKey: 'twelve-labours.proof-label.moving-time' },
            { type: 'stat', value: '5:40/km', labelKey: 'twelve-labours.proof-label.average-pace' },
            {
              type: 'stat',
              value: '8h44',
              labelKey: 'twelve-labours.proof-label.metro-equivalent',
            },
            { type: 'photo', value: '/media/12-travaux/avril-2026-journal.jpg' },
            {
              type: 'link',
              value: 'https://www.strava.com/activities/18324410776',
              labelKey: 'twelve-labours.proof-label.strava-line-fourteen',
            },
          ],
        },
      ],
    },
    {
      monthNumber: 5,
      nameKey: 'common.month.may',
      challenges: [
        {
          titleKey: 'twelve-labours.edition.2026.may.backyard.title',
          kind: 'oneshot',
          status: 'done',
          proofs: [
            {
              type: 'link',
              value: 'https://strava.app.link/P6Onm5asZ4b',
              labelKey: 'twelve-labours.proof-label.strava',
            },
          ],
        },
      ],
    },
    {
      monthNumber: 6,
      nameKey: 'common.month.june',
      challenges: [
        {
          titleKey: 'twelve-labours.edition.2026.june.daily-poem.title',
          kind: 'daily',
          status: 'failed',
        },
        {
          titleKey: 'twelve-labours.edition.2026.june.montecristo.title',
          kind: 'oneshot',
          status: 'done',
          noteKey: 'twelve-labours.edition.2026.june.montecristo.note',
          proofs: [
            {
              type: 'link',
              value: 'https://strava.app.link/S8TeY3CsZ4b',
              labelKey: 'twelve-labours.proof-label.strava',
            },
          ],
        },
      ],
    },
    {
      monthNumber: 7,
      nameKey: 'common.month.july',
      challenges: [
        {
          titleKey: 'twelve-labours.edition.2026.july.half-marathon.title',
          kind: 'oneshot',
          status: 'doing',
          noteKey: 'twelve-labours.edition.2026.july.half-marathon.note',
        },
        {
          titleKey: 'twelve-labours.edition.2026.july.catan-championship.title',
          kind: 'oneshot',
          status: 'doing',
        },
      ],
    },
    {
      monthNumber: 8,
      nameKey: 'common.month.august',
      challenges: [
        {
          titleKey: 'twelve-labours.edition.2026.august.annecy-crossing.title',
          kind: 'oneshot',
          status: 'todo',
        },
      ],
    },
    {
      monthNumber: 9,
      nameKey: 'common.month.september',
      challenges: [
        {
          titleKey: 'twelve-labours.edition.2026.september.lepin-under-six-hours.title',
          kind: 'oneshot',
          status: 'todo',
        },
        {
          titleKey: 'twelve-labours.edition.2026.september.pragma-dates.title',
          kind: 'oneshot',
          status: 'todo',
        },
      ],
    },
    {
      monthNumber: 10,
      nameKey: 'common.month.october',
      challenges: [
        {
          titleKey: 'twelve-labours.edition.2026.october.paris-dieppe.title',
          kind: 'oneshot',
          status: 'todo',
          noteKey: 'twelve-labours.edition.2026.october.paris-dieppe.note',
        },
      ],
    },
    {
      monthNumber: 11,
      nameKey: 'common.month.november',
      challenges: [
        {
          titleKey: 'twelve-labours.edition.2026.november.three-thousand-pages.title',
          kind: 'count',
          status: 'todo',
        },
      ],
    },
    {
      monthNumber: 12,
      nameKey: 'common.month.december',
      challenges: [
        {
          titleKey: 'twelve-labours.edition.2026.december.chess-rating.title',
          kind: 'oneshot',
          status: 'todo',
        },
      ],
    },
  ],
};
