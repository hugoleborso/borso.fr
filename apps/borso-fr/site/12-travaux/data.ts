// Les 12 travaux de Borso — source unique de vérité.
// Édité à la main, poussé en PR.
//
// Médias : fichiers dans `apps/borso-fr/site/public/media/12-travaux/`,
// référencés en absolu (`/media/12-travaux/ma-photo.jpg`). Le préfixe
// `/media/12-travaux/` évite la collision avec la route `/12-travaux/`.
//
// Image de couverture du mois (hero) :
//   cover: '/media/12-travaux/avril-2026-carte.jpg'
//
// Ajouter une preuve sur un défi (`proofs: [...]`) :
//   { type: 'photo', v: '/media/12-travaux/ma-photo.jpg' }
//   { type: 'video', v: '/media/12-travaux/ma-video.mp4' }
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
// Ajouter une année : nouveau `data-<year>.ts` exportant `Y<year>: Year`, puis brancher ci-dessous.

import type { Data } from './data.types';
import { Y2025 } from './data-2025';
import { Y2026 } from './data-2026';

export type {
  Challenge,
  ChallengeKind,
  ChallengeStatus,
  Data,
  Month,
  Proof,
  ProofType,
  Year,
} from './data.types';

export const DATA: Data = {
  years: {
    2025: Y2025,
    2026: Y2026,
  },
};
