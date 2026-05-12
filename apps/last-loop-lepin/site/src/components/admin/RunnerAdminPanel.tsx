import { useState } from 'react';
import { ApiError, apiClient } from '../../api/client';
import { invalidateResource, useResource } from '../../data/useResource';
import { initialsAvatar } from '../../domain/initials.utils';
import type { RaceEditionDto, RunnerDto } from '../../domain/types';

interface RunnerAdminPanelProps {
  readonly edition: RaceEditionDto;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function RunnerAdminPanel({ edition }: RunnerAdminPanelProps) {
  const rosterKey = `runners:${edition.slug}`;
  const rosterState = useResource(rosterKey, () => apiClient.listRunners(edition.slug));
  const roster: readonly RunnerDto[] = rosterState.value?.runners ?? [];

  const [displayName, setDisplayName] = useState('');
  const [bib, setBib] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const trimmedBib = bib.trim();
      const parsedBib = trimmedBib.length === 0 ? null : Number.parseInt(trimmedBib, 10);
      await apiClient.adminCreateRunner({
        editionSlug: edition.slug,
        slug: slugify(displayName),
        displayName: displayName.trim(),
        bib: parsedBib !== null && Number.isFinite(parsedBib) ? parsedBib : null,
      });
      setDisplayName('');
      setBib('');
      invalidateResource(rosterKey);
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 409) {
        setError('Un coureur avec ce slug existe déjà.');
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
        <h2 className="card-title">Coureurs inscrits</h2>
        <span className="muted mono">{roster.length}</span>
      </div>
      <form className="card-body col" onSubmit={(event) => void handleSubmit(event)}>
        <div className="row" style={{ gap: 'var(--d-3)', flexWrap: 'wrap' }}>
          <div className="field" style={{ flex: 1, minWidth: 180 }}>
            <label className="field-label" htmlFor="runner-name">Nom</label>
            <input
              id="runner-name"
              className="input"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              required
              minLength={2}
            />
          </div>
          <div className="field" style={{ width: 80 }}>
            <label className="field-label" htmlFor="runner-bib">Dossard</label>
            <input
              id="runner-bib"
              type="number"
              className="input"
              value={bib}
              onChange={(event) => setBib(event.target.value)}
              min={1}
            />
          </div>
          <div className="field" style={{ alignSelf: 'flex-end' }}>
            <button className="btn btn-primary btn-sm" type="submit" disabled={submitting}>
              Ajouter
            </button>
          </div>
        </div>
        {error !== null ? <div className="error-text">{error}</div> : null}
      </form>
      <div className="card-body flush">
        {roster.length === 0 ? (
          <div className="card-body muted">Aucun coureur inscrit.</div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {roster.map((runner) => {
              const avatar = initialsAvatar(runner.displayName);
              return (
                <li key={runner.slug} className="leaderboard-row">
                  <span className="rank mono">{runner.bib === null ? '—' : `#${runner.bib}`}</span>
                  <div className="row">
                    <span className="avatar" style={{ background: avatar.backgroundColor }}>
                      {avatar.initials}
                    </span>
                    <span className="runner-name">{runner.displayName}</span>
                  </div>
                  <span className="loop-info">{runner.slug}</span>
                  <span className="muted mono" />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
