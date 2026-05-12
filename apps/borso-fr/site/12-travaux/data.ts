// Les 12 travaux de Borso — source unique de vérité.
// Édité à la main, poussé en PR.
//
// Ajouter une preuve sur un défi (`proofs: [...]`) :
//   { type: 'photo', v: 'ma-photo.jpg' }
//   { type: 'video', v: 'ma-video.mp4' }
//   { type: 'link',  v: 'https://...', label: 'Strava' }
//   { type: 'note',  v: 'Texte court' }
//   { type: 'stat',  v: '19\'47' }
//
// Statuses d'un défi :
//   'done'      — réussi
//   'partial'   — partiellement réussi (compte 0,5)
//   'failed'    — échoué
//   'abandoned' — abandonné en cours de route
//   'doing'     — en cours (mois actuel)
//   'todo'      — à venir (mois futur)
//
// Types de défi :
//   'daily'   — quotidien pendant le mois
//   'count'   — objectif chiffré
//   'oneshot' — ponctuel
//
// Ajouter une année : nouvelle clé sous `years:` avec les 12 mois dans l'ordre.

export type ChallengeStatus = 'done' | 'partial' | 'failed' | 'abandoned' | 'doing' | 'todo';
export type ChallengeKind = 'daily' | 'count' | 'oneshot';
export type ProofType = 'photo' | 'video' | 'link' | 'note' | 'stat';

type Proof = { type: ProofType; v: string; label?: string };

export type Challenge = {
  t: string;
  kind: ChallengeKind;
  status: ChallengeStatus;
  note?: string;
  proofs?: Proof[];
};

export type Month = { m: number; name: string; challenges: Challenge[] };
export type Year = { title: string; subtitle: string; months: Month[] };
type Data = { years: Record<number, Year> };

export const DATA: Data = {
  years: {
    2025: {
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
                {
                  type: 'link',
                  v: 'https://www.strava.com/activities/14026738794',
                  label: 'Strava',
                },
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
                {
                  type: 'link',
                  v: 'https://www.strava.com/activities/14416006753',
                  label: 'Strava',
                },
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
                {
                  type: 'link',
                  v: 'https://www.strava.com/activities/15639920646',
                  label: 'Strava',
                },
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
                {
                  type: 'link',
                  v: 'https://www.strava.com/activities/15798133433',
                  label: 'Nage',
                },
                {
                  type: 'link',
                  v: 'https://www.strava.com/activities/15798155427',
                  label: 'Vélo',
                },
                {
                  type: 'link',
                  v: 'https://www.strava.com/activities/15798133580',
                  label: 'Course',
                },
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
              note: "10 m en fosse (max autorisé) ; 50 m en dynamique à côté. Génial — et plus facile que prévu.",
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
              note: '7h14, 30 km, 3 900 D+ Strava (4 300 D+ casquette verte).',
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
    },

    2026: {
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
            { t: 'Sport tous les jours', kind: 'daily', status: 'done' },
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
          challenges: [
            {
              t: "Courir toutes les lignes de métro dans l'ordre en 1 mois",
              kind: 'daily',
              status: 'done',
              note: '263 km de course, 24h51 de course, 8h44 de métro. Dernière ligne : la 14.',
              proofs: [
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
              t: 'Montecristo — finir, puis sub-1h30 sur semi en parallèle',
              kind: 'oneshot',
              status: 'todo',
            },
          ],
        },
        {
          m: 7,
          name: 'Juillet',
          challenges: [
            { t: 'Sub-1h30 au semi', kind: 'oneshot', status: 'todo' },
            {
              t: 'Participer aux championnats de France de Catan',
              kind: 'oneshot',
              status: 'todo',
            },
          ],
        },
        {
          m: 8,
          name: 'Août',
          challenges: [
            { t: "Traversée du lac d'Annecy à la nage", kind: 'oneshot', status: 'todo' },
          ],
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
            { t: 'Paris–Dieppe à vélo en 1j et se baigner', kind: 'oneshot', status: 'todo' },
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
            {
              t: 'Atteindre 1500 ELO aux échecs dans une cadence',
              kind: 'oneshot',
              status: 'todo',
            },
          ],
        },
      ],
    },
  },
};
