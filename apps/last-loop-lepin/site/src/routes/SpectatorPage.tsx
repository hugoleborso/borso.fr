import { apiClient } from '../api/client';
import { Countdown } from '../components/Countdown';
import { CourseMap } from '../components/CourseMap';
import { EliminatedWall } from '../components/EliminatedWall';
import { Leaderboard } from '../components/Leaderboard';
import { LoopsTimeline } from '../components/LoopsTimeline';
import { useResource } from '../data/useResource';
import { useStandings } from '../data/useStandingsPoll';
import type { RaceEditionDto } from '../domain/types';

const RACE_CACHE_KEY = 'edition:current';

function describeEdition(edition: RaceEditionDto | null): string {
  if (edition === null) return "Pas d'édition annoncée pour l'instant.";
  const date = new Date(edition.startsAt).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return `${edition.displayName} — ${date}, Lépin-le-Lac.`;
}

function nextLoopBoundary(edition: RaceEditionDto, now: number): number {
  const startMs = new Date(edition.startsAt).getTime();
  const endMs = new Date(edition.endsAt).getTime();
  if (now <= startMs) return startMs;
  if (now >= endMs) return endMs;
  const intervalMs = edition.intervalMinutes * 60_000;
  const elapsed = now - startMs;
  const elapsedIntervals = Math.floor(elapsed / intervalMs);
  return startMs + (elapsedIntervals + 1) * intervalMs;
}

export function SpectatorPage() {
  const editionState = useResource(RACE_CACHE_KEY, () => apiClient.getCurrentEdition());
  const edition = editionState.value?.edition ?? null;
  const standingsState = useStandings(edition?.slug ?? '');
  const standings = standingsState.standings;

  if (editionState.error !== null) {
    return (
      <div className="main">
        <div className="card">
          <div className="card-body error-text">
            Le serveur ne répond pas pour l'instant. Réessayez dans un instant.
          </div>
        </div>
      </div>
    );
  }

  if (edition === null) {
    return (
      <div className="main">
        <div className="card">
          <div className="card-head">
            <h2 className="card-title">Last Loop Lépin</h2>
          </div>
          <div className="card-body muted">{describeEdition(edition)}</div>
        </div>
      </div>
    );
  }

  const isLive = edition.status === 'live';
  const isFinished = edition.status === 'finished';
  const upcomingBoundary = nextLoopBoundary(edition, Date.now());

  return (
    <div className="main">
      {isFinished ? (
        <div className="banner">Course terminée — classement final affiché.</div>
      ) : null}
      <div className="spectator-grid">
        <div className="card" style={{ gridColumn: '1', gridRow: '1' }}>
          <div className="card-head">
            <h2 className="card-title">Classement</h2>
            {isLive ? <span className="live-pill">Live</span> : null}
          </div>
          <div className="card-body flush">
            <Leaderboard ranked={standings?.ranked ?? []} />
          </div>
        </div>
        <div className="card" style={{ gridColumn: '2', gridRow: '1' }}>
          <div className="card-head">
            <h2 className="card-title">Prochain top horaire</h2>
            <span className="muted mono">{edition.displayName}</span>
          </div>
          <div className="card-body">
            <Countdown targetEpochMs={upcomingBoundary} label="Tic-tac" />
          </div>
        </div>
        <div className="card" style={{ gridColumn: '1', gridRow: '2' }}>
          <div className="card-head">
            <h2 className="card-title">Mur des éliminés</h2>
          </div>
          <EliminatedWall ranked={standings?.ranked ?? []} />
        </div>
        <div className="card" style={{ gridColumn: '2', gridRow: '2' }}>
          <div className="card-head">
            <h2 className="card-title">Tracé</h2>
          </div>
          <CourseMap edition={edition} />
        </div>
      </div>
      <div className="card" style={{ marginTop: 'var(--d-4)' }}>
        <div className="card-head">
          <h2 className="card-title">Boucles</h2>
          <span className="muted mono">Tops + lever/coucher du soleil</span>
        </div>
        <div className="card-body flush">
          <LoopsTimeline edition={edition} />
        </div>
      </div>
    </div>
  );
}
