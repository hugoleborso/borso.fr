import type { Edition } from './labours.types';

export const EDITION_2025: Edition = {
  titleKey: 'twelve-labours.edition.2025.title',
  subtitleKey: 'twelve-labours.edition.2025.subtitle',
  months: [
    {
      monthNumber: 1,
      nameKey: 'common.month.january',
      challenges: [
        {
          titleKey: 'twelve-labours.edition.2025.january.daily-sport.title',
          kind: 'daily',
          status: 'partial',
          noteKey: 'twelve-labours.edition.2025.january.daily-sport.note',
        },
        {
          titleKey: 'twelve-labours.edition.2025.january.volleyball-spike.title',
          kind: 'oneshot',
          status: 'done',
        },
      ],
    },
    {
      monthNumber: 2,
      nameKey: 'common.month.february',
      challenges: [
        {
          titleKey: 'twelve-labours.edition.2025.february.phone-time.title',
          kind: 'daily',
          status: 'partial',
          noteKey: 'twelve-labours.edition.2025.february.phone-time.note',
        },
        {
          titleKey: 'twelve-labours.edition.2025.february.fourteen-books.title',
          kind: 'count',
          status: 'partial',
          noteKey: 'twelve-labours.edition.2025.february.fourteen-books.note',
          proofs: [{ type: 'stat', value: '7 / 14' }],
        },
      ],
    },
    {
      monthNumber: 3,
      nameKey: 'common.month.march',
      challenges: [
        {
          titleKey: 'twelve-labours.edition.2025.march.golden-arrow.title',
          kind: 'oneshot',
          status: 'done',
          proofs: [
            { type: 'photo', value: '/media/12-travaux/mars-2025-fleche-or-pin.jpg' },
            { type: 'video', value: '/media/12-travaux/mars-2025-fleche-or.mp4' },
            {
              type: 'link',
              value: 'https://technique.esf.net/index.php?page=resultat&code=102154',
              labelKey: 'twelve-labours.proof-label.esf-result',
            },
          ],
        },
      ],
    },
    {
      monthNumber: 4,
      nameKey: 'common.month.april',
      challenges: [
        {
          titleKey: 'twelve-labours.edition.2025.april.five-kilometres-under-twenty.title',
          kind: 'oneshot',
          status: 'done',
          proofs: [
            { type: 'stat', value: "19'17" },
            { type: 'photo', value: '/media/12-travaux/avril-2025-foulees-podium.jpg' },
            {
              type: 'link',
              value: 'https://www.strava.com/activities/14026738794',
              labelKey: 'twelve-labours.proof-label.strava',
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
          titleKey: 'twelve-labours.edition.2025.may.gr75.title',
          kind: 'oneshot',
          status: 'done',
          noteKey: 'twelve-labours.edition.2025.may.gr75.note',
          proofs: [
            { type: 'stat', value: '50 km', labelKey: 'twelve-labours.proof-label.distance' },
            { type: 'stat', value: '5h08', labelKey: 'twelve-labours.proof-label.time' },
            { type: 'photo', value: '/media/12-travaux/mai-2025-gr75-betise.jpg' },
            { type: 'photo', value: '/media/12-travaux/mai-2025-gr75-10km.jpg' },
            { type: 'photo', value: '/media/12-travaux/mai-2025-gr75-20km.jpg' },
            { type: 'photo', value: '/media/12-travaux/mai-2025-gr75-corentin-borne.jpg' },
            { type: 'photo', value: '/media/12-travaux/mai-2025-gr75-selfie-borne.jpg' },
            { type: 'photo', value: '/media/12-travaux/mai-2025-gr75-30km.jpg' },
            { type: 'photo', value: '/media/12-travaux/mai-2025-gr75-40km.jpg' },
            { type: 'photo', value: '/media/12-travaux/mai-2025-gr75-50km.jpg' },
            {
              type: 'link',
              value: 'https://www.strava.com/activities/14416006753',
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
          titleKey: 'twelve-labours.edition.2025.june.monte-cristo.title',
          kind: 'oneshot',
          status: 'partial',
          noteKey: 'twelve-labours.edition.2025.june.monte-cristo.note',
          proofs: [
            { type: 'stat', value: "1h29'30", labelKey: 'twelve-labours.proof-label.pool-time' },
            { type: 'photo', value: '/media/12-travaux/juin-2025-marseille-calanques.jpg' },
            { type: 'photo', value: '/media/12-travaux/juin-2025-marseille-salome.jpg' },
          ],
        },
      ],
    },
    {
      monthNumber: 7,
      nameKey: 'common.month.july',
      challenges: [
        {
          titleKey: 'twelve-labours.edition.2025.july.chess-openings.title',
          kind: 'daily',
          status: 'failed',
          noteKey: 'twelve-labours.edition.2025.july.chess-openings.note',
        },
        {
          titleKey: 'twelve-labours.edition.2025.july.rapid-rating.title',
          kind: 'oneshot',
          status: 'failed',
          noteKey: 'twelve-labours.edition.2025.july.rapid-rating.note',
        },
      ],
    },
    {
      monthNumber: 8,
      nameKey: 'common.month.august',
      challenges: [
        {
          titleKey: 'twelve-labours.edition.2025.august.two-hundred-kilometre-ride.title',
          kind: 'oneshot',
          status: 'done',
          proofs: [
            { type: 'photo', value: '/media/12-travaux/aout-2025-velo-selfie.jpg' },
            { type: 'photo', value: '/media/12-travaux/aout-2025-velo-eglise.jpg' },
            {
              type: 'link',
              value: 'https://www.strava.com/activities/15639920646',
              labelKey: 'twelve-labours.proof-label.strava',
            },
          ],
        },
        {
          titleKey: 'twelve-labours.edition.2025.august.mediterranean-crossing.title',
          kind: 'oneshot',
          status: 'abandoned',
          noteKey: 'twelve-labours.edition.2025.august.mediterranean-crossing.note',
        },
      ],
    },
    {
      monthNumber: 9,
      nameKey: 'common.month.september',
      challenges: [
        {
          titleKey: 'twelve-labours.edition.2025.september.triathlon.title',
          kind: 'oneshot',
          status: 'done',
          proofs: [
            { type: 'photo', value: '/media/12-travaux/septembre-2025-triathlon-groupe.jpg' },
            { type: 'photo', value: '/media/12-travaux/septembre-2025-triathlon-avant.jpg' },
            { type: 'photo', value: '/media/12-travaux/septembre-2025-triathlon-stretching.jpg' },
            { type: 'photo', value: '/media/12-travaux/septembre-2025-triathlon-grass.jpg' },
            { type: 'stat', value: '6h19', labelKey: 'twelve-labours.proof-label.total-time' },
            {
              type: 'link',
              value: 'https://www.strava.com/activities/15798133433',
              labelKey: 'twelve-labours.proof-label.swim',
            },
            {
              type: 'link',
              value: 'https://www.strava.com/activities/15798155427',
              labelKey: 'twelve-labours.proof-label.bike',
            },
            {
              type: 'link',
              value: 'https://www.strava.com/activities/15798133580',
              labelKey: 'twelve-labours.proof-label.run',
            },
          ],
        },
        {
          titleKey: 'twelve-labours.edition.2025.september.daily-sport.title',
          kind: 'daily',
          status: 'abandoned',
        },
      ],
    },
    {
      monthNumber: 10,
      nameKey: 'common.month.october',
      challenges: [
        {
          titleKey: 'twelve-labours.edition.2025.october.free-diving.title',
          kind: 'oneshot',
          status: 'partial',
          noteKey: 'twelve-labours.edition.2025.october.free-diving.note',
        },
      ],
    },
    {
      monthNumber: 11,
      nameKey: 'common.month.november',
      challenges: [
        {
          titleKey: 'twelve-labours.edition.2025.november.montmartre-steps.title',
          kind: 'oneshot',
          status: 'done',
          noteKey: 'twelve-labours.edition.2025.november.montmartre-steps.note',
          proofs: [
            { type: 'stat', value: '7h14', labelKey: 'twelve-labours.proof-label.total-time' },
            { type: 'stat', value: '30 km', labelKey: 'twelve-labours.proof-label.distance' },
            {
              type: 'stat',
              value: '3 900 m',
              labelKey: 'twelve-labours.proof-label.strava-elevation',
            },
            { type: 'photo', value: '/media/12-travaux/novembre-2025-montmartre-groupe.jpg' },
            { type: 'photo', value: '/media/12-travaux/novembre-2025-montmartre-hugo.jpg' },
            { type: 'photo', value: '/media/12-travaux/novembre-2025-montmartre-crepuscule.jpg' },
            { type: 'photo', value: '/media/12-travaux/novembre-2025-montmartre-nuit.jpg' },
            {
              type: 'link',
              value: 'https://www.strava.com/activities/16533006331',
              labelKey: 'twelve-labours.proof-label.strava',
            },
          ],
        },
      ],
    },
    {
      monthNumber: 12,
      nameKey: 'common.month.december',
      challenges: [
        {
          titleKey: 'twelve-labours.edition.2025.december.italy-without-english.title',
          kind: 'oneshot',
          status: 'abandoned',
        },
        {
          titleKey: 'twelve-labours.edition.2025.december.muscle-up.title',
          kind: 'oneshot',
          status: 'abandoned',
        },
      ],
    },
  ],
};
