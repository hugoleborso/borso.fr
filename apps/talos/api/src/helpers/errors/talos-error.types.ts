export type TalosErrorStatus = 400 | 401 | 403 | 404 | 409 | 429 | 502 | 503;

interface TalosErrorDefinition {
  readonly status: TalosErrorStatus;
  readonly message: string;
}

export const TALOS_ERRORS = {
  'invalid-input': { status: 400, message: 'Requête invalide.' },
  'session-required': { status: 401, message: 'Connexion requise.' },
  'invalid-bootstrap-code': { status: 401, message: 'Code de démarrage invalide.' },
  'passkey-verification-failed': { status: 401, message: "La passkey n'a pas été reconnue." },
  'invalid-bearer-token': { status: 401, message: 'Jeton invalide.' },
  'registration-closed': {
    status: 403,
    message: 'Inscription fermée : connecte-toi pour ajouter une passkey.',
  },
  'page-not-found': { status: 404, message: 'Page introuvable.' },
  'todo-not-found': { status: 404, message: 'Tâche introuvable.' },
  'proposal-not-found': { status: 404, message: 'Proposition introuvable.' },
  'passkey-not-found': { status: 404, message: 'Passkey introuvable.' },
  'draft-not-found': { status: 404, message: 'Brouillon introuvable.' },
  'brief-not-found': { status: 404, message: 'Brief introuvable.' },
  'review-not-found': { status: 404, message: 'Revue introuvable.' },
  'todo-duplicate': { status: 409, message: 'Cette tâche existe déjà.' },
  'proposal-already-decided': { status: 409, message: 'Cette proposition est déjà tranchée.' },
  'proposal-not-revocable': {
    status: 409,
    message: 'Aucune décision à annuler : la proposition est en attente ou déjà traitée.',
  },
  'draft-status-conflict': { status: 409, message: 'Ce brouillon a déjà changé de statut.' },
  'last-passkey': {
    status: 409,
    message: 'Impossible de supprimer la dernière passkey : ajoutes-en une autre avant.',
  },
  'content-conflict': { status: 409, message: 'Le fichier a changé entre-temps, réessaie.' },
  'rate-limited': { status: 429, message: 'Trop de tentatives, réessaie plus tard.' },
  'content-unavailable': { status: 502, message: 'GitHub ne répond pas.' },
  'not-configured': { status: 503, message: "Talos n'est pas encore configuré." },
} as const satisfies Record<string, TalosErrorDefinition>;

export type TalosErrorCode = keyof typeof TALOS_ERRORS;

// @FollowsBlueprint named-domain-error
export class TalosError extends Error {
  public readonly code: TalosErrorCode;

  constructor(code: TalosErrorCode) {
    super(code);
    this.name = 'TalosError';
    this.code = code;
  }
}

export function isTalosError(candidate: unknown): candidate is TalosError {
  return candidate instanceof TalosError;
}
