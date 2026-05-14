import { apiClient } from '../api/client';
import { CorrectionBanner } from '../components/CorrectionBanner';
import { Countdown } from '../components/Countdown';
import { CourseMap } from '../components/CourseMap';
import { EliminatedWall } from '../components/EliminatedWall';
import { Leaderboard } from '../components/Leaderboard';
import { useResource } from '../data/useResource';
import { useStandings } from '../data/useStandingsPoll';
import type { RaceEditionDto, RankedRunnerDto } from '../domain/types';

function InRaceCounter({ ranked }: { readonly ranked: readonly RankedRunnerDto[] }) {
  const inRace = ranked.filter((entry) => entry.status.kind === 'in-race').length;
  const dnf = ranked.length - inRace;
  return (
    <div className="in-race-counter">
      <div className="in-race-counter__main">
        <span className="in-race-counter__value mono">{inRace}</span>
        <span className="in-race-counter__label">en course</span>
      </div>
      <span className="in-race-counter__detail muted mono">{dnf} DNF</span>
    </div>
  );
}

const RACE_CACHE_KEY = 'edition:current';
const ALL_EDITIONS_KEY = 'editions:all';

function formatRaceDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
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

function HorsJourJ({
  upcoming,
  archives,
}: {
  readonly upcoming: RaceEditionDto | null;
  readonly archives: readonly RaceEditionDto[];
}) {
  return (
    <div className="main col">
      <div className="card">
        <div className="card-head">
          <h2 className="card-title">Last Loop Lépin</h2>
          <span className="muted mono">Lépin-le-Lac</span>
        </div>
        <div className="card-body col">
          {upcoming === null ? (
            <div className="muted">Pas d'édition annoncée pour l'instant.</div>
          ) : (
            <>
              <strong style={{ fontSize: 18 }}>{upcoming.displayName}</strong>
              <span className="muted">
                Départ : {formatRaceDate(upcoming.startsAt)} ·{' '}
                {upcoming.gpx.distanceMeters > 0
                  ? `${(upcoming.gpx.distanceMeters / 1000).toFixed(2)} km`
                  : 'Tracé à venir'}{' '}
                · {Math.round(upcoming.gpx.elevationGainMeters)} m D+
              </span>
              <Countdown targetEpochMs={new Date(upcoming.startsAt).getTime()} label="Départ dans" />
            </>
          )}
        </div>
      </div>
      <div className="card">
        <div className="card-head">
          <h2 className="card-title">Archives</h2>
          <span className="muted mono">{archives.length} édition{archives.length === 1 ? '' : 's'}</span>
        </div>
        <div className="card-body">
          {archives.length === 0 ? (
            <div className="muted">Aucune édition archivée.</div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {archives.map((edition) => (
                <li key={edition.slug} style={{ padding: '8px 0', borderBottom: '1px solid var(--line-soft)' }}>
                  <strong>{edition.displayName}</strong>
                  <span className="muted" style={{ marginLeft: 8 }}>
                    {formatRaceDate(edition.startsAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export function SpectatorPage() {
  const editionState = useResource(RACE_CACHE_KEY, () => apiClient.getCurrentEdition());
  const allEditionsState = useResource(ALL_EDITIONS_KEY, () => apiClient.listEditions());
  const edition = editionState.value?.edition ?? null;
  const allEditions = allEditionsState.value?.editions ?? [];
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

  if (edition === null || edition.status === 'setup') {
    const archives = allEditions.filter((entry) => entry.status === 'finished');
    return <HorsJourJ upcoming={edition} archives={archives} />;
  }

  const isLive = edition.status === 'live';
  const isFinished = edition.status === 'finished';
  const upcomingBoundary = nextLoopBoundary(edition, Date.now());
  const mostRecentCorrection =
    standingsState.mostRecentCorrectionAt === null
      ? null
      : new Date(standingsState.mostRecentCorrectionAt);

  return (
    <div className="main">
      {isFinished ? (
        <div className="banner row" style={{ justifyContent: 'space-between' }}>
          <span>Course terminée — classement final affiché.</span>
          <a
            className="btn btn-sm"
            href={`/api/standings/${encodeURIComponent(edition.slug)}/csv`}
          >
            Télécharger le CSV
          </a>
        </div>
      ) : null}
      <CorrectionBanner correctedAt={mostRecentCorrection} />
      <div className="spectator-hero">
        <div className="card countdown-card">
          <div className="card-head">
            <h2 className="card-title">Prochain top horaire</h2>
            <span className="muted mono">{edition.displayName}</span>
          </div>
          <div className="card-body col">
            <Countdown targetEpochMs={upcomingBoundary} label="" />
            <InRaceCounter ranked={standings?.ranked ?? []} />
          </div>
        </div>
        <div className="card">
          <div className="card-head">
            <h2 className="card-title">Tracé</h2>
            <span className="muted mono">
              {standings === null ? '' : `${standings.ranked.filter((entry) => entry.status.kind === 'in-race').length} en course`}
            </span>
          </div>
          <CourseMap edition={edition} ranked={standings?.ranked ?? []} now={new Date()} />
        </div>
      </div>
      <div className="card classement-card">
        <div className="card-head">
          <h2 className="card-title">Classement</h2>
          {isLive ? <span className="live-pill">Live</span> : null}
        </div>
        <div className="card-body flush">
          <Leaderboard ranked={standings?.ranked ?? []} />
        </div>
      </div>
      <div className="card">
        <div className="card-head">
          <h2 className="card-title">Mur des éliminés</h2>
        </div>
        <EliminatedWall ranked={standings?.ranked ?? []} />
      </div>
    </div>
  );
}
