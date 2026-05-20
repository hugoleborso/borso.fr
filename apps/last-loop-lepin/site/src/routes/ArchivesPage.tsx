import { apiClient } from '../api/client';
import { useResource } from '../data/useResource';
import type { RaceEditionDto } from '../domain/types';

const ALL_EDITIONS_KEY = 'editions:all';

function formatRaceDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function ArchivesPage() {
  const editionsState = useResource(ALL_EDITIONS_KEY, () => apiClient.listEditions());
  const editions = editionsState.value?.editions ?? [];
  const archives = editions
    .filter((entry) => entry.status === 'finished')
    .toSorted((left, right) => new Date(right.endsAt).getTime() - new Date(left.endsAt).getTime());

  return (
    <div className="main col">
      <div className="card">
        <div className="card-head">
          <h2 className="card-title">Archives</h2>
          <span className="muted mono">
            {archives.length} édition{archives.length === 1 ? '' : 's'}
          </span>
        </div>
        {archives.length === 0 ? (
          <div className="card-body muted">Aucune édition archivée pour l'instant.</div>
        ) : (
          archives.map((edition) => <ArchiveEntry key={edition.slug} edition={edition} />)
        )}
      </div>
    </div>
  );
}

function ArchiveEntry({ edition }: { readonly edition: RaceEditionDto }) {
  const key = `archive-standings:${edition.slug}`;
  const standingsState = useResource(key, () => apiClient.getStandings(edition.slug));
  const ranked = standingsState.value?.standings.ranked ?? [];

  return (
    <div className="card-body col" style={{ borderBottom: '1px solid var(--line-soft)' }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <strong>{edition.displayName}</strong>
        <span className="muted mono">{formatRaceDate(edition.startsAt)}</span>
      </div>
      <div className="muted mono" style={{ fontSize: 11 }}>
        {(edition.gpx.distanceMeters / 1000).toFixed(2)} km ·{' '}
        {Math.round(edition.gpx.elevationGainMeters)} m D+
      </div>
      <div className="card-body flush" style={{ paddingTop: 'var(--d-2)' }}>
        {ranked.length === 0 ? (
          <div className="muted">Classement non disponible.</div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {ranked.slice(0, 5).map((entry) => (
              <li key={entry.runner.slug} className="leaderboard-row">
                <span className="rank mono">{entry.rank === 'ex-aequo' ? '=' : entry.rank}</span>
                <a href={`/r/${encodeURIComponent(entry.runner.slug)}`} className="runner-name">
                  {entry.runner.displayName}
                </a>
                <span className="loop-info">
                  {entry.status.kind === 'in-race'
                    ? `B${entry.status.lastLoop}`
                    : `DNF B${entry.status.outAtLoop}`}
                </span>
                <span
                  className={`status-pill ${entry.status.kind === 'in-race' ? 'in-race' : 'dnf'}`}
                >
                  {entry.status.kind === 'in-race' ? 'survivant' : 'dnf'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="row" style={{ gap: 'var(--d-3)', marginTop: 'var(--d-2)' }}>
        <a className="btn btn-sm" href={`/api/standings/${encodeURIComponent(edition.slug)}/csv`}>
          Classement (CSV)
        </a>
        <a
          className="btn btn-sm"
          href={`/api/standings/${encodeURIComponent(edition.slug)}/laps.csv`}
        >
          Stats par boucle (CSV)
        </a>
      </div>
    </div>
  );
}
