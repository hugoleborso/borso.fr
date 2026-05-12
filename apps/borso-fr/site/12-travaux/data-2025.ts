import type { Year } from './data.types';

export const Y2025: Year = {
  title: 'Première édition',
  subtitle: "Une douzaine de défis pour donner du rythme à l'année.",
  months: [
    {
      m: 1,
      name: 'Janvier',
      challenges: [
        {
          t: 'Sport tous les jours',
          kind: 'daily',
          status: 'partial',
          note: "Un blocage de dos au milieu du mois m'a coupé la série ; j'ai rattrapé des jours en février.",
        },
        { t: 'Smasher correctement au volley', kind: 'oneshot', status: 'done' },
      ],
    },
    {
      m: 2,
      name: 'Février',
      challenges: [
        {
          t: '2h de téléphone / jour en moyenne',
          kind: 'daily',
          status: 'partial',
          note: 'Plutôt bien réussi, modulo quelques petits écarts.',
        },
        {
          t: '14 livres dans le mois',
          kind: 'count',
          status: 'partial',
          note: '7 livres lus : Barjavel, Gogol, Benzine, Roux, da Empoli, Henn.',
          proofs: [{ type: 'stat', v: '7 / 14' }],
        },
      ],
    },
    {
      m: 3,
      name: 'Mars',
      challenges: [
        {
          t: "Passer la Flèche d'Or",
          kind: 'oneshot',
          status: 'done',
          proofs: [
            {
              type: 'link',
              v: 'https://technique.esf.net/index.php?page=resultat&code=102154',
              label: 'Résultat ESF',
            },
          ],
        },
      ],
    },
    {
      m: 4,
      name: 'Avril',
      challenges: [
        {
          t: '5 km sub-20',
          kind: 'oneshot',
          status: 'done',
          proofs: [
            { type: 'stat', v: "19'17" },
            { type: 'link', v: 'https://www.strava.com/activities/14026738794', label: 'Strava' },
          ],
        },
      ],
    },
    {
      m: 5,
      name: 'Mai',
      challenges: [
        {
          t: 'Le GR75',
          kind: 'oneshot',
          status: 'done',
          proofs: [
            { type: 'link', v: 'https://www.strava.com/activities/14416006753', label: 'Strava' },
          ],
        },
      ],
    },
    {
      m: 6,
      name: 'Juin',
      challenges: [
        {
          t: 'Le Monte-Cristo (5 km nage)',
          kind: 'oneshot',
          status: 'partial',
          note: 'Course en mer annulée — 5 km en piscine à la place.',
          proofs: [{ type: 'stat', v: "1h29'30" }],
        },
      ],
    },
    {
      m: 7,
      name: 'Juillet',
      challenges: [
        {
          t: 'Apprendre 1 ouverture / jour',
          kind: 'daily',
          status: 'failed',
          note: "C'est les vacances tu connais.",
        },
        {
          t: 'Monter à 1500 en rapid',
          kind: 'oneshot',
          status: 'failed',
          note: "C'est les vacances tu connais.",
        },
      ],
    },
    {
      m: 8,
      name: 'Août',
      challenges: [
        {
          t: "200 km à vélo d'un coup",
          kind: 'oneshot',
          status: 'done',
          proofs: [
            { type: 'link', v: 'https://www.strava.com/activities/15639920646', label: 'Strava' },
          ],
        },
        {
          t: 'Traversée de la Méditerranée en bateau',
          kind: 'oneshot',
          status: 'abandoned',
          note: "J'y reviendrai.",
        },
      ],
    },
    {
      m: 9,
      name: 'Septembre',
      challenges: [
        {
          t: 'Triathlon L et battre mon record',
          kind: 'oneshot',
          status: 'done',
          proofs: [
            { type: 'stat', v: '6h19' },
            { type: 'link', v: 'https://www.strava.com/activities/15798133433', label: 'Nage' },
            { type: 'link', v: 'https://www.strava.com/activities/15798155427', label: 'Vélo' },
            { type: 'link', v: 'https://www.strava.com/activities/15798133580', label: 'Course' },
          ],
        },
        { t: 'Sport tous les jours', kind: 'daily', status: 'abandoned' },
      ],
    },
    {
      m: 10,
      name: 'Octobre',
      challenges: [
        {
          t: '20 m en apnée',
          kind: 'oneshot',
          status: 'partial',
          note: '10 m en fosse (max autorisé) ; 50 m en dynamique à côté. Génial — et plus facile que prévu.',
        },
      ],
    },
    {
      m: 11,
      name: 'Novembre',
      challenges: [
        {
          t: '100× les marches de Montmartre dans la journée',
          kind: 'oneshot',
          status: 'done',
          note: '4 300 D+ avec casquette verte.',
          proofs: [
            { type: 'stat', v: '7h14', label: 'Temps total' },
            { type: 'stat', v: '30 km', label: 'Distance' },
            { type: 'stat', v: '3 900 D+', label: 'Dénivelé Strava' },
            {
              type: 'link',
              v: 'https://www.strava.com/activities/16533006331',
              label: 'Strava',
            },
          ],
        },
      ],
    },
    {
      m: 12,
      name: 'Décembre',
      challenges: [
        { t: "Aller en Italie sans utiliser l'anglais", kind: 'oneshot', status: 'abandoned' },
        { t: 'Faire un muscle-up', kind: 'oneshot', status: 'abandoned' },
      ],
    },
  ],
};
