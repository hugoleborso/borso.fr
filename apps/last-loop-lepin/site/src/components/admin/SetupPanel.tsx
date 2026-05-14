import { useState } from 'react';
import { ApiError, apiClient } from '../../api/client';
import { invalidateResource } from '../../data/useResource';
import type { RaceEditionDto } from '../../domain/types';
import {
  defaultEndsAt,
  defaultStartsAt,
  isoLocal,
  suggestNextSlug,
  summariseZodError,
} from './setup-form.utils';

interface SetupPanelProps {
  readonly currentEdition: RaceEditionDto | null;
}

const EDITING_SLUG_KEY = 'setup-slug';

export function SetupPanel({ currentEdition }: SetupPanelProps) {
  // Three rendering modes:
  //   - `setup` edition in progress → edit mode (PUT, slug read-only)
  //   - `live` / `finished` edition  → readonly card on top + create form
  //     for the NEXT edition below (POST, slug pre-filled with a sensible
  //     suggestion like `lepin-2026` → `lepin-2027`)
  //   - no edition                  → just the create form
  const isEditing = currentEdition !== null && currentEdition.status === 'setup';
  const showReadonlyCard = currentEdition !== null && currentEdition.status !== 'setup';
  const initialSlug = isEditing
    ? (currentEdition?.slug ?? 'lepin-2026')
    : suggestNextSlug(currentEdition?.slug);
  const initialDisplayName = isEditing
    ? (currentEdition?.displayName ?? 'Last Loop Lépin 2026')
    : 'Last Loop Lépin';
  const [slug, setSlug] = useState(initialSlug);
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [startsAt, setStartsAt] = useState(
    isEditing && currentEdition !== null
      ? isoLocal(new Date(currentEdition.startsAt))
      : defaultStartsAt(),
  );
  const [endsAt, setEndsAt] = useState(
    isEditing && currentEdition !== null
      ? isoLocal(new Date(currentEdition.endsAt))
      : defaultEndsAt(),
  );
  const [intervalMinutes, setIntervalMinutes] = useState(
    String(isEditing && currentEdition !== null ? currentEdition.intervalMinutes : 60),
  );
  const [gpxXml, setGpxXml] = useState('');
  const [gpxFileName, setGpxFileName] = useState<string | null>(null);
  const [gpxReadError, setGpxReadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const intervalMinutesNumber = Number.parseInt(intervalMinutes, 10);
      const basePayload = {
        displayName,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        intervalMinutes: Number.isFinite(intervalMinutesNumber) ? intervalMinutesNumber : 60,
      };
      if (isEditing && currentEdition !== null) {
        // In edit mode, an empty `gpxXml` means "keep the persisted trace".
        // The server schema marks `gpxXml` optional on update so we just
        // omit the key — `adminReplaceEdition` returns a JSON without the
        // sunrise / GPX shift in that case.
        await apiClient.adminReplaceEdition(
          currentEdition.slug,
          gpxXml.length === 0 ? basePayload : { ...basePayload, gpxXml },
        );
      } else {
        await apiClient.adminCreateEdition({ slug, ...basePayload, gpxXml });
      }
      setGpxXml('');
      setGpxFileName(null);
      invalidateResource('edition:current');
      invalidateResource('editions:all');
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 409) {
        setError(
          isEditing
            ? "L'édition a démarré : modification verrouillée."
            : 'Une édition avec ce slug existe déjà.',
        );
      } else if (caught instanceof ApiError && caught.status === 400) {
        const summary = summariseZodError(caught.body);
        setError(
          summary === null
            ? 'Données invalides (vérifier le GPX et les horaires).'
            : `Données invalides → ${summary}`,
        );
      } else {
        setError(caught instanceof Error ? caught.message : 'Erreur inconnue.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTransition(nextStatus: 'setup' | 'live' | 'finished'): Promise<void> {
    if (currentEdition === null) return;
    const label =
      nextStatus === 'live'
        ? 'Démarrer la course maintenant ? Le classement live devient visible côté spectateur.'
        : nextStatus === 'finished'
          ? 'Terminer la course ? Plus aucun pointage ne sera accepté.'
          : "Réouvrir l'édition en setup ? Tu pourras modifier le GPX et les horaires de nouveau.";
    if (!confirm(label)) return;
    setTransitioning(true);
    setError(null);
    try {
      await apiClient.adminTransitionEditionStatus(currentEdition.slug, nextStatus);
      invalidateResource('edition:current');
      invalidateResource('editions:all');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Erreur inconnue.');
    } finally {
      setTransitioning(false);
    }
  }

  async function handleDelete(): Promise<void> {
    if (currentEdition === null) return;
    if (!confirm(`Supprimer l'édition "${currentEdition.displayName}" ? Cette action est irréversible.`)) {
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      await apiClient.adminDeleteEdition(currentEdition.slug);
      invalidateResource('edition:current');
      invalidateResource('editions:all');
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 409) {
        setError("L'édition a démarré : suppression verrouillée.");
      } else {
        setError(caught instanceof Error ? caught.message : 'Erreur inconnue.');
      }
    } finally {
      setDeleting(false);
    }
  }

  const readonlyCard =
    showReadonlyCard && currentEdition !== null ? (
      <div className="card">
        <div className="card-head">
          <h2 className="card-title">Édition courante</h2>
          <span className="muted mono">
            {currentEdition.displayName} · {currentEdition.status}
          </span>
        </div>
        <div className="card-body col">
          <div className="muted mono">
            Distance : {(currentEdition.gpx.distanceMeters / 1000).toFixed(2)} km · D+{' '}
            {Math.round(currentEdition.gpx.elevationGainMeters)} m
          </div>
          <div className="muted mono">
            Lever : {new Date(currentEdition.sunriseAt).toLocaleTimeString('fr-FR')} · Coucher :{' '}
            {new Date(currentEdition.sunsetAt).toLocaleTimeString('fr-FR')}
          </div>
          <div className="row" style={{ gap: 'var(--d-2)', flexWrap: 'wrap' }}>
            {currentEdition.status === 'live' ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void handleTransition('finished')}
                disabled={transitioning}
              >
                {transitioning ? 'Mise à jour…' : 'Terminer la course'}
              </button>
            ) : (
              <button
                type="button"
                className="btn"
                onClick={() => void handleTransition('setup')}
                disabled={transitioning}
                title="Annule le 'finished' et permet de re-modifier l'édition. Conserve les coureurs et les pointages."
              >
                {transitioning ? 'Mise à jour…' : 'Réouvrir cette édition'}
              </button>
            )}
          </div>
        </div>
      </div>
    ) : null;

  const formCard = (
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
      <form className="card-body col" onSubmit={(event) => void handleSubmit(event)}>
        <div className="field">
          <label className="field-label" htmlFor={EDITING_SLUG_KEY}>Slug</label>
          <input
            id={EDITING_SLUG_KEY}
            className="input"
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            required
            minLength={3}
            readOnly={isEditing}
            disabled={isEditing}
          />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="setup-name">Nom</label>
          <input id="setup-name" className="input" value={displayName} onChange={(event) => setDisplayName(event.target.value)} required />
        </div>
        <div className="row" style={{ gap: 'var(--d-3)' }}>
          <div className="field" style={{ flex: 1 }}>
            <label className="field-label" htmlFor="setup-start">Début</label>
            <input id="setup-start" type="datetime-local" className="input" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} required />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label className="field-label" htmlFor="setup-end">Fin</label>
            <input id="setup-end" type="datetime-local" className="input" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} required />
          </div>
          <div className="field" style={{ flex: '0 0 140px' }}>
            <label className="field-label" htmlFor="setup-interval">Boucle (min)</label>
            <input
              id="setup-interval"
              type="number"
              className="input"
              value={intervalMinutes}
              onChange={(event) => setIntervalMinutes(event.target.value)}
              min={1}
              max={240}
              step={1}
              required
            />
          </div>
        </div>
        {isEditing && currentEdition !== null ? (
          <div className="muted mono" style={{ fontSize: 11 }}>
            GPX actuel : {(currentEdition.gpx.distanceMeters / 1000).toFixed(2)} km · D+ {Math.round(currentEdition.gpx.elevationGainMeters)} m.
            Choisir un nouveau fichier ci-dessous le remplace.
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
            accept=".gpx,application/gpx+xml,text/xml,application/xml"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              setGpxReadError(null);
              if (file === null) {
                setGpxXml('');
                setGpxFileName(null);
                return;
              }
              setGpxFileName(file.name);
              // `file.text()` reads as UTF-8 — Strava + Garmin both export
              // UTF-8 GPX so that's the right default.
              file
                .text()
                .then((content) => setGpxXml(content))
                .catch((caught: unknown) => {
                  setGpxXml('');
                  setGpxReadError(
                    caught instanceof Error ? caught.message : 'Lecture du fichier impossible.',
                  );
                });
            }}
            required={!isEditing}
          />
          {gpxFileName !== null ? (
            <div className="muted mono" style={{ fontSize: 11 }}>
              {gpxFileName} ({(gpxXml.length / 1024).toFixed(1)} kB chargés)
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
                onClick={() => void handleTransition('live')}
                disabled={submitting || deleting || transitioning}
                title="Passe l'édition en status live. Le classement devient visible côté spectateur et les pointages sont acceptés."
              >
                {transitioning ? 'Démarrage…' : '🏁 Démarrer la course'}
              </button>
              <button
                className="btn btn-danger"
                type="button"
                onClick={() => void handleDelete()}
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

  if (isEditing) {
    return formCard;
  }
  return (
    <>
      {readonlyCard}
      {formCard}
    </>
  );
}
