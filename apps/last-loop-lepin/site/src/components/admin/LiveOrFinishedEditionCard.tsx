import type { RaceEditionDto } from '../../domain/types';

interface LiveOrFinishedEditionCardProps {
  readonly edition: RaceEditionDto;
  readonly transitioning: boolean;
  readonly onTransition: (nextStatus: 'setup' | 'live' | 'finished') => void;
}

/**
 * Readonly summary of the current `live` or `finished` edition, with the
 * single transition button that fits the status (`live` → `finished`,
 * `finished` → `setup`). Sibling of `EditionEditForm`; both are
 * orchestrated by `SetupPanel`.
 */
export function LiveOrFinishedEditionCard({
  edition,
  transitioning,
  onTransition,
}: LiveOrFinishedEditionCardProps) {
  return (
    <div className="card">
      <div className="card-head">
        <h2 className="card-title">
          Édition {edition.status === 'live' ? 'en cours' : 'précédente'}
        </h2>
        <span className="muted mono">
          {edition.displayName} · {edition.status}
        </span>
      </div>
      <div className="card-body col">
        <div className="muted mono">
          Distance : {(edition.gpx.distanceMeters / 1000).toFixed(2)} km · D+{' '}
          {Math.round(edition.gpx.elevationGainMeters)} m
        </div>
        <div className="muted mono">
          Lever : {new Date(edition.sunriseAt).toLocaleTimeString('fr-FR')} · Coucher :{' '}
          {new Date(edition.sunsetAt).toLocaleTimeString('fr-FR')}
        </div>
        <div className="row" style={{ gap: 'var(--d-2)', flexWrap: 'wrap' }}>
          {edition.status === 'live' ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onTransition('finished')}
              disabled={transitioning}
            >
              {transitioning ? 'Mise à jour…' : 'Terminer la course'}
            </button>
          ) : (
            <button
              type="button"
              className="btn"
              onClick={() => onTransition('setup')}
              disabled={transitioning}
              title="Annule le 'finished' et permet de re-modifier l'édition. Conserve les coureurs et les pointages."
            >
              {transitioning ? 'Mise à jour…' : 'Réouvrir cette édition'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
