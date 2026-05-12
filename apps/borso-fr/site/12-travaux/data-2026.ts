import type { Year } from './data.types';

export const Y2026: Year = {
  title: 'Deuxième édition',
  subtitle: 'Plus structuré. Moins de défis hors-sol, plus de promesses tenables.',
  months: [
    {
      m: 1,
      name: 'Janvier',
      challenges: [
        {
          t: 'Mois de la positivité — partager du positif chaque jour avec les colocs',
          kind: 'daily',
          status: 'done',
        },
        {
          t: 'Sport tous les jours',
          kind: 'daily',
          status: 'done',
          proofs: [
            { type: 'stat', v: '31', label: 'Jours' },
            { type: 'stat', v: '26h', label: 'Temps' },
            { type: 'stat', v: '196,9 km', label: 'Distance' },
            { type: 'stat', v: '1 165 m', label: 'Dénivelé' },
            { type: 'photo', v: '/media/12-travaux/janvier-2026-sport-strava.png' },
          ],
        },
      ],
    },
    {
      m: 2,
      name: 'Février',
      challenges: [
        {
          t: 'Au lit à 23h, extinction 23h30 (6j/7)',
          kind: 'daily',
          status: 'partial',
          note: '3 semaines sur 4. Sacrés changements de vie ; sympa de se lever sans réveil.',
          proofs: [
            { type: 'photo', v: '/media/12-travaux/fevrier-2026-nuit-1.jpg' },
            { type: 'photo', v: '/media/12-travaux/fevrier-2026-nuit-2.jpg' },
          ],
        },
        {
          t: 'Trouver et organiser 2 dates pour Pragma',
          kind: 'oneshot',
          status: 'abandoned',
          note: 'Décalé à septembre.',
        },
        {
          t: '10×1h de sport dans la même journée',
          kind: 'oneshot',
          status: 'done',
          note: 'Aux Pyramides avec Arnoult et Matmat. Sacrée journée.',
        },
      ],
    },
    {
      m: 3,
      name: 'Mars',
      challenges: [
        { t: 'Être admissible au CAPES de maths', kind: 'oneshot', status: 'done' },
        {
          t: 'Battre le métro entre 2 stations',
          kind: 'oneshot',
          status: 'done',
          note: 'Saint-Georges → Notre-Dame-de-Lorette.',
        },
        { t: '3h de HT par semaine', kind: 'daily', status: 'abandoned' },
      ],
    },
    {
      m: 4,
      name: 'Avril',
      cover: '/media/12-travaux/avril-2026-carte.jpg',
      challenges: [
        {
          t: "Courir toutes les lignes de métro dans l'ordre en 1 mois",
          kind: 'daily',
          status: 'done',
          note: 'Dernière ligne : la 14.',
          proofs: [
            { type: 'stat', v: '263 km', label: 'Distance totale' },
            { type: 'stat', v: '24h51', label: 'Temps en mouvement' },
            { type: 'stat', v: '5:40/km', label: 'Allure moyenne' },
            { type: 'stat', v: '8h44', label: 'Si pris en métro' },
            { type: 'photo', v: '/media/12-travaux/avril-2026-journal.jpg' },
            {
              type: 'link',
              v: 'https://www.strava.com/activities/18324410776',
              label: 'Strava (ligne 14)',
            },
          ],
        },
      ],
    },
    {
      m: 5,
      name: 'Mai',
      challenges: [
        { t: 'Organiser une Backyard et y participer', kind: 'oneshot', status: 'doing' },
      ],
    },
    {
      m: 6,
      name: 'Juin',
      challenges: [
        { t: '1 poème / jour à une personne différente', kind: 'daily', status: 'todo' },
        {
          t: 'Finir la Montecristo',
          kind: 'oneshot',
          status: 'todo',
          note: 'Objectif subsidiaire : sub-1h30. 5 km de nage en eau libre à Marseille, avec Salomé.',
        },
      ],
    },
    {
      m: 7,
      name: 'Juillet',
      challenges: [
        { t: 'Sub-1h30 au semi', kind: 'oneshot', status: 'todo' },
        { t: 'Participer aux championnats de France de Catan', kind: 'oneshot', status: 'todo' },
      ],
    },
    {
      m: 8,
      name: 'Août',
      challenges: [{ t: "Traversée du lac d'Annecy à la nage", kind: 'oneshot', status: 'todo' }],
    },
    {
      m: 9,
      name: 'Septembre',
      challenges: [
        { t: 'Sub-6h au L de Lépin', kind: 'oneshot', status: 'todo' },
        { t: 'Trouver et organiser 2 dates pour Pragma', kind: 'oneshot', status: 'todo' },
      ],
    },
    {
      m: 10,
      name: 'Octobre',
      challenges: [
        {
          t: 'Paris–Dieppe à vélo en 1j et se baigner',
          kind: 'oneshot',
          status: 'todo',
          note: 'Avec les colocs.',
        },
      ],
    },
    {
      m: 11,
      name: 'Novembre',
      challenges: [{ t: '3000 pages lues dans le mois', kind: 'count', status: 'todo' }],
    },
    {
      m: 12,
      name: 'Décembre',
      challenges: [
        { t: 'Atteindre 1500 ELO aux échecs dans une cadence', kind: 'oneshot', status: 'todo' },
      ],
    },
  ],
};
