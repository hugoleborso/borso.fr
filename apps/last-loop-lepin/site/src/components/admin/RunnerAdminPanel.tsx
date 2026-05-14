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
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ALLOWED_PHOTO_TYPES: ReadonlySet<string> = new Set(['image/jpeg', 'image/png', 'image/webp']);
  const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

  async function uploadPhoto(slug: string, file: File): Promise<string> {
    if (!ALLOWED_PHOTO_TYPES.has(file.type)) {
      throw new Error(`Format ${file.type} non supporté (JPEG / PNG / WebP).`);
    }
    if (file.size > MAX_PHOTO_BYTES) {
      throw new Error('Photo > 5 Mo — refusée côté client.');
    }
    const presign = await apiClient.adminPresignPhoto({
      editionSlug: edition.slug,
      runnerSlug: slug,
      contentType: file.type,
    });
    const uploadResponse = await fetch(presign.uploadUrl, {
      method: 'PUT',
      headers: { 'content-type': file.type },
      body: file,
    });
    if (!uploadResponse.ok) {
      throw new Error(`Upload S3 a échoué (${uploadResponse.status}).`);
    }
    return presign.objectKey;
  }

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const slug = slugify(displayName);
      const parsedBib = Number.parseInt(bib.trim(), 10);
      if (!Number.isFinite(parsedBib) || parsedBib <= 0) {
        setError('Le numéro de dossard est obligatoire (1 ou plus).');
        setSubmitting(false);
        return;
      }
      const photoKey = photoFile === null ? null : await uploadPhoto(slug, photoFile);
      await apiClient.adminCreateRunner({
        editionSlug: edition.slug,
        slug,
        displayName: displayName.trim(),
        bib: parsedBib,
        photoKey,
      });
      setDisplayName('');
      setBib('');
      setPhotoFile(null);
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
              max={9999}
              required
            />
          </div>
          <div className="field" style={{ flex: 1, minWidth: 180 }}>
            <label className="field-label" htmlFor="runner-photo">Photo (selfie ou upload)</label>
            <input
              id="runner-photo"
              type="file"
              className="input"
              accept="image/jpeg,image/png,image/webp"
              capture="user"
              onChange={(event) => setPhotoFile(event.target.files?.[0] ?? null)}
            />
          </div>
          <div className="field" style={{ alignSelf: 'flex-end' }}>
            <button className="btn btn-primary btn-sm" type="submit" disabled={submitting}>
              {submitting ? 'Envoi…' : 'Ajouter'}
            </button>
          </div>
        </div>
        <div className="muted mono" style={{ fontSize: 11 }}>
          Aucune photo → initiales déterministes sur fond coloré (fallback automatique).
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
