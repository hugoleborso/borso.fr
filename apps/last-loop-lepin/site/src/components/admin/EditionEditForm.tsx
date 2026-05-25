import type { RaceEditionDto } from '../../domain/types';

const EDITING_SLUG_KEY = 'setup-slug';

interface EditionEditFormProps {
  readonly currentEdition: RaceEditionDto | null;
  readonly isEditing: boolean;
  readonly showReadonlyCard: boolean;
  readonly slug: string;
  readonly displayName: string;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly intervalMinutes: string;
  readonly gpxFile: File | null;
  readonly gpxReadError: string | null;
  readonly error: string | null;
  readonly submitting: boolean;
  readonly deleting: boolean;
  readonly transitioning: boolean;
  readonly onSlugChange: (value: string) => void;
  readonly onDisplayNameChange: (value: string) => void;
  readonly onStartsAtChange: (value: string) => void;
  readonly onEndsAtChange: (value: string) => void;
  readonly onIntervalMinutesChange: (value: string) => void;
  readonly onGpxFileChange: (file: File | null) => void;
  readonly onSubmit: (event: React.FormEvent) => void;
  readonly onTransitionLive: () => void;
  readonly onDelete: () => void;
}

/**
 * The create / edit form card. Sibling of `LiveOrFinishedEditionCard`;
 * both are orchestrated by `SetupPanel` which owns the state and the
 * write-path effects. Keeping the JSX-heavy form here keeps `SetupPanel`
 * under the `noExcessiveLinesPerFile` ceiling enforced repo-wide.
 */
export function EditionEditForm({
  currentEdition,
  isEditing,
  showReadonlyCard,
  slug,
  displayName,
  startsAt,
  endsAt,
  intervalMinutes,
  gpxFile,
  gpxReadError,
  error,
  submitting,
  deleting,
  transitioning,
  onSlugChange,
  onDisplayNameChange,
  onStartsAtChange,
  onEndsAtChange,
  onIntervalMinutesChange,
  onGpxFileChange,
  onSubmit,
  onTransitionLive,
  onDelete,
}: EditionEditFormProps) {
  return (
    <div className="card">
      <div className="card-head">
        <h2 className="card-title">
          {isEditing
            ? "Modifier l'édition"
            : showReadonlyCard
              ? 'Créer la prochaine édition'
              : 'Créer une édition'}
        </h2>
        <span className="muted mono">
          {isEditing
            ? 'status: setup'
            : showReadonlyCard
              ? 'nouveau slug requis'
              : 'configuration initiale'}
        </span>
      </div>
      <form className="card-body col" onSubmit={onSubmit}>
        <div className="field">
          <label className="field-label" htmlFor={EDITING_SLUG_KEY}>
            Slug
          </label>
          <input
            id={EDITING_SLUG_KEY}
            className="input"
            value={slug}
            onChange={(event) => onSlugChange(event.target.value)}
            required
            minLength={3}
            readOnly={isEditing}
            disabled={isEditing}
          />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="setup-name">
            Nom
          </label>
          <input
            id="setup-name"
            className="input"
            value={displayName}
            onChange={(event) => onDisplayNameChange(event.target.value)}
            required
          />
        </div>
        <div className="row" style={{ gap: 'var(--d-3)' }}>
          <div className="field" style={{ flex: 1 }}>
            <label className="field-label" htmlFor="setup-start">
              Début
            </label>
            <input
              id="setup-start"
              type="datetime-local"
              className="input"
              value={startsAt}
              onChange={(event) => onStartsAtChange(event.target.value)}
              required
            />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label className="field-label" htmlFor="setup-end">
              Fin
            </label>
            <input
              id="setup-end"
              type="datetime-local"
              className="input"
              value={endsAt}
              onChange={(event) => onEndsAtChange(event.target.value)}
              required
            />
          </div>
          <div className="field" style={{ flex: '0 0 140px' }}>
            <label className="field-label" htmlFor="setup-interval">
              Boucle (min)
            </label>
            <input
              id="setup-interval"
              type="number"
              className="input"
              value={intervalMinutes}
              onChange={(event) => onIntervalMinutesChange(event.target.value)}
              min={1}
              max={240}
              step={1}
              required
            />
          </div>
        </div>
        {isEditing && currentEdition !== null ? (
          <div className="muted mono" style={{ fontSize: 11 }}>
            GPX actuel : {(currentEdition.gpx.distanceMeters / 1000).toFixed(2)} km · D+{' '}
            {Math.round(currentEdition.gpx.elevationGainMeters)} m. Choisir un nouveau fichier
            ci-dessous le remplace.
          </div>
        ) : null}
        <div className="field">
          <label className="field-label" htmlFor="setup-gpx">
            GPX {isEditing ? '(nouveau tracé)' : '(fichier .gpx)'}
          </label>
          <input
            id="setup-gpx"
            type="file"
            className="input"
            // iOS Files filters by UTI and has no built-in entry for `.gpx`,
            // so any `accept` value greys the file out on the picker. Skip
            // the hint — server-side `parseGpx` rejects non-GPX content
            // with a 400 anyway.
            onChange={(event) => onGpxFileChange(event.target.files?.[0] ?? null)}
            required={!isEditing}
          />
          {gpxFile !== null ? (
            <div className="muted mono" style={{ fontSize: 11 }}>
              {gpxFile.name} ({(gpxFile.size / 1024).toFixed(1)} kB)
            </div>
          ) : null}
          {gpxReadError !== null ? <div className="error-text">{gpxReadError}</div> : null}
        </div>
        <div className="muted mono" style={{ fontSize: 11 }}>
          Sunrise / sunset sont calculés depuis le premier point du GPX et la date de départ.
        </div>
        {error !== null ? <div className="error-text">{error}</div> : null}
        <div className="row" style={{ gap: 'var(--d-2)', flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary"
            type="submit"
            disabled={submitting || deleting || transitioning}
          >
            {submitting
              ? isEditing
                ? 'Mise à jour…'
                : 'Création…'
              : isEditing
                ? 'Remplacer le GPX / mettre à jour'
                : "Créer l'édition"}
          </button>
          {isEditing ? (
            <>
              <button
                className="btn btn-primary"
                type="button"
                onClick={onTransitionLive}
                disabled={submitting || deleting || transitioning}
                title="Passe l'édition en status live. Le classement devient visible côté spectateur et les pointages sont acceptés."
              >
                {transitioning ? 'Démarrage…' : '🏁 Démarrer la course'}
              </button>
              <button
                className="btn btn-danger"
                type="button"
                onClick={onDelete}
                disabled={submitting || deleting || transitioning}
              >
                {deleting ? 'Suppression…' : "Supprimer l'édition"}
              </button>
            </>
          ) : null}
        </div>
      </form>
    </div>
  );
}
