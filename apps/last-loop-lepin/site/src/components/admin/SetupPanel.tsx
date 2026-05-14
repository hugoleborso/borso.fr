import { useState } from 'react';
import { z } from 'zod';
import { ApiError, apiClient } from '../../api/client';
import { invalidateResource } from '../../data/useResource';
import type { RaceEditionDto } from '../../domain/types';

interface SetupPanelProps {
  readonly currentEdition: RaceEditionDto | null;
}

function isoLocal(date: Date): string {
  const pad = (value: number): string => `${value}`.padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function defaultStartsAt(): string {
  const now = new Date();
  now.setHours(6, 0, 0, 0);
  return isoLocal(now);
}

function defaultEndsAt(): string {
  const now = new Date();
  now.setHours(22, 0, 0, 0);
  return isoLocal(now);
}

const zodValidationErrorSchema = z.object({
  error: z.object({
    issues: z
      .array(
        z.object({
          path: z.array(z.union([z.string(), z.number()])).optional(),
          message: z.string().optional(),
        }),
      )
      .min(1),
  }),
});

/**
 * Pull a human-readable summary out of a `zValidator` 400 body. Hono's
 * default error shape is `{ success: false, error: { issues: [...] } }`
 * — surface the path + message of each issue so the operator sees which
 * field actually failed instead of a generic "données invalides" hint.
 */
function summariseZodError(body: unknown): string | null {
  const parsed = zodValidationErrorSchema.safeParse(body);
  if (!parsed.success) return null;
  return parsed.data.error.issues
    .map((issue) => `${(issue.path ?? []).join('.') || '?'}: ${issue.message ?? 'invalide'}`)
    .join(' · ');
}

const EDITING_SLUG_KEY = 'setup-slug';

export function SetupPanel({ currentEdition }: SetupPanelProps) {
  // When an edition is already in `setup`, the form re-opens in "edit"
  // mode: every field is pre-filled with the persisted value, the slug
  // becomes read-only (it's the PK), and submit fires PUT instead of
  // POST. The GPX textarea stays empty by default — pasting + submitting
  // replaces the persisted GPX, which is the explicit ergonomic goal:
  // iterate the trace without recreating the whole edition.
  const isEditing = currentEdition !== null && currentEdition.status === 'setup';
  const [slug, setSlug] = useState(currentEdition?.slug ?? 'lepin-2026');
  const [displayName, setDisplayName] = useState(currentEdition?.displayName ?? 'Last Loop Lépin 2026');
  const [startsAt, setStartsAt] = useState(
    currentEdition === null ? defaultStartsAt() : isoLocal(new Date(currentEdition.startsAt)),
  );
  const [endsAt, setEndsAt] = useState(
    currentEdition === null ? defaultEndsAt() : isoLocal(new Date(currentEdition.endsAt)),
  );
  const [gpxXml, setGpxXml] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        displayName,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        gpxXml,
      };
      if (isEditing && currentEdition !== null) {
        await apiClient.adminReplaceEdition(currentEdition.slug, payload);
      } else {
        await apiClient.adminCreateEdition({ slug, ...payload });
      }
      setGpxXml('');
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

  if (currentEdition !== null && currentEdition.status !== 'setup') {
    const isLive = currentEdition.status === 'live';
    return (
      <div className="card">
        <div className="card-head">
          <h2 className="card-title">Setup de course</h2>
          <span className="muted mono">{currentEdition.displayName}</span>
        </div>
        <div className="card-body col">
          <div className="muted">
            Édition courante : <strong>{currentEdition.displayName}</strong> ({currentEdition.status})
          </div>
          <div className="muted mono">
            Distance : {(currentEdition.gpx.distanceMeters / 1000).toFixed(2)} km ·{' '}
            D+ : {Math.round(currentEdition.gpx.elevationGainMeters)} m
          </div>
          <div className="muted mono">
            Lever : {new Date(currentEdition.sunriseAt).toLocaleTimeString('fr-FR')} ·{' '}
            Coucher : {new Date(currentEdition.sunsetAt).toLocaleTimeString('fr-FR')}
          </div>
          {error !== null ? <div className="error-text">{error}</div> : null}
          <div className="row" style={{ gap: 'var(--d-2)' }}>
            {isLive ? (
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
              >
                {transitioning ? 'Mise à jour…' : 'Réouvrir en setup'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-head">
        <h2 className="card-title">Setup de course</h2>
        <span className="muted mono">
          {isEditing ? "Modifier l'édition (status: setup)" : "Créer / configurer l'édition"}
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
        </div>
        {isEditing && currentEdition !== null ? (
          <div className="muted mono" style={{ fontSize: 11 }}>
            GPX actuel : {(currentEdition.gpx.distanceMeters / 1000).toFixed(2)} km · D+ {Math.round(currentEdition.gpx.elevationGainMeters)} m.
            Coller un nouveau GPX ci-dessous le remplace.
          </div>
        ) : null}
        <div className="field">
          <label className="field-label" htmlFor="setup-gpx">
            GPX {isEditing ? '(nouveau tracé)' : '(collé tel quel)'}
          </label>
          <textarea
            id="setup-gpx"
            className="input"
            rows={6}
            value={gpxXml}
            onChange={(event) => setGpxXml(event.target.value)}
            placeholder="<?xml version=…><gpx><trk>…</trk></gpx>"
            required
          />
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
}
