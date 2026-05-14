import { useState } from 'react';
import { ApiError, apiClient } from '../../api/client';
import { invalidateResource } from '../../data/useResource';
import {
  defaultEndsAt,
  defaultStartsAt,
  summariseZodError,
} from './setup-form.utils';

interface CreateEditionFormProps {
  readonly suggestedSlug: string;
  readonly suggestedDisplayName: string;
  readonly headerTitle: string;
  readonly headerHint: string;
}

const SLUG_INPUT_ID = 'create-slug';

/**
 * Standalone "create a new edition" form. Holds its own state so it can
 * sit next to the edit form of an existing setup edition without sharing
 * field values with it. Submit → POST /api/admin/editions; on 409 the
 * banner asks for a different slug; on 400 we surface the ZodError paths
 * (slug / startsAt / endsAt / gpxXml) so the operator fixes the right
 * field.
 */
export function CreateEditionForm({
  suggestedSlug,
  suggestedDisplayName,
  headerTitle,
  headerHint,
}: CreateEditionFormProps) {
  const [slug, setSlug] = useState(suggestedSlug);
  const [displayName, setDisplayName] = useState(suggestedDisplayName);
  const [startsAt, setStartsAt] = useState(defaultStartsAt());
  const [endsAt, setEndsAt] = useState(defaultEndsAt());
  const [intervalMinutes, setIntervalMinutes] = useState('60');
  const [gpxFile, setGpxFile] = useState<File | null>(null);
  const [gpxReadError, setGpxReadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setGpxReadError(null);
    try {
      if (gpxFile === null) {
        setError("Choisis un fichier GPX avant de créer l'édition.");
        return;
      }
      let gpxXml: string;
      try {
        gpxXml = await gpxFile.text();
      } catch (caught) {
        setGpxReadError(
          caught instanceof Error ? caught.message : 'Lecture du fichier impossible.',
        );
        return;
      }
      if (gpxXml.length === 0) {
        setGpxReadError('Le fichier choisi est vide.');
        return;
      }
      const intervalMinutesNumber = Number.parseInt(intervalMinutes, 10);
      await apiClient.adminCreateEdition({
        slug,
        displayName,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        intervalMinutes: Number.isFinite(intervalMinutesNumber) ? intervalMinutesNumber : 60,
        gpxXml,
      });
      setGpxFile(null);
      invalidateResource('edition:current');
      invalidateResource('editions:all');
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 409) {
        setError('Une édition avec ce slug existe déjà. Choisis-en un autre.');
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

  return (
    <div className="card">
      <div className="card-head">
        <h2 className="card-title">{headerTitle}</h2>
        <span className="muted mono">{headerHint}</span>
      </div>
      <form className="card-body col" onSubmit={(event) => void handleSubmit(event)}>
        <div className="field">
          <label className="field-label" htmlFor={SLUG_INPUT_ID}>
            Slug
          </label>
          <input
            id={SLUG_INPUT_ID}
            className="input"
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            required
            minLength={3}
          />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="create-name">
            Nom
          </label>
          <input
            id="create-name"
            className="input"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            required
          />
        </div>
        <div className="row" style={{ gap: 'var(--d-3)' }}>
          <div className="field" style={{ flex: 1 }}>
            <label className="field-label" htmlFor="create-start">
              Début
            </label>
            <input
              id="create-start"
              type="datetime-local"
              className="input"
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
              required
            />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label className="field-label" htmlFor="create-end">
              Fin
            </label>
            <input
              id="create-end"
              type="datetime-local"
              className="input"
              value={endsAt}
              onChange={(event) => setEndsAt(event.target.value)}
              required
            />
          </div>
          <div className="field" style={{ flex: '0 0 140px' }}>
            <label className="field-label" htmlFor="create-interval">
              Boucle (min)
            </label>
            <input
              id="create-interval"
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
        <div className="field">
          <label className="field-label" htmlFor="create-gpx">
            GPX (fichier .gpx)
          </label>
          <input
            id="create-gpx"
            type="file"
            className="input"
            onChange={(event) => {
              setGpxFile(event.target.files?.[0] ?? null);
              setGpxReadError(null);
            }}
            required
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
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Création…' : "Créer l'édition"}
          </button>
        </div>
      </form>
    </div>
  );
}
