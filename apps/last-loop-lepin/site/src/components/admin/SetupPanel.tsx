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

/**
 * Pull a human-readable summary out of a `zValidator` 400 body. Hono's
 * default error shape is `{ success: false, error: { issues: [...] } }`
 * — surface the path + message of each issue so the operator sees which
 * field actually failed instead of a generic "données invalides" hint.
 */
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

function summariseZodError(body: unknown): string | null {
  const parsed = zodValidationErrorSchema.safeParse(body);
  if (!parsed.success) return null;
  return parsed.data.error.issues
    .map((issue) => `${(issue.path ?? []).join('.') || '?'}: ${issue.message ?? 'invalide'}`)
    .join(' · ');
}

export function SetupPanel({ currentEdition }: SetupPanelProps) {
  const [slug, setSlug] = useState('lepin-2026');
  const [displayName, setDisplayName] = useState('Last Loop Lépin 2026');
  const [startsAt, setStartsAt] = useState(defaultStartsAt());
  const [endsAt, setEndsAt] = useState(defaultEndsAt());
  const [gpxXml, setGpxXml] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiClient.adminCreateEdition({
        slug,
        displayName,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        gpxXml,
      });
      invalidateResource('edition:current');
      invalidateResource('editions:all');
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 409) {
        setError('Une édition avec ce slug existe déjà.');
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

  if (currentEdition !== null && currentEdition.status !== 'setup') {
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
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-head">
        <h2 className="card-title">Setup de course</h2>
        <span className="muted mono">Créer / configurer l'édition</span>
      </div>
      <form className="card-body col" onSubmit={(event) => void handleSubmit(event)}>
        <div className="field">
          <label className="field-label" htmlFor="setup-slug">Slug</label>
          <input id="setup-slug" className="input" value={slug} onChange={(event) => setSlug(event.target.value)} required minLength={3} />
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
        <div className="field">
          <label className="field-label" htmlFor="setup-gpx">GPX (collé tel quel)</label>
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
        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {submitting ? 'Création…' : 'Créer l\'édition'}
        </button>
      </form>
    </div>
  );
}
