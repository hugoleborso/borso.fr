import { useState } from 'react';
import { apiClient } from '../api/client';
import { CorrectionBanner } from '../components/CorrectionBanner';
import { Countdown } from '../components/Countdown';
import { CourseMap } from '../components/CourseMap';
import { ElevationProfile } from '../components/ElevationProfile';
import { Leaderboard } from '../components/Leaderboard';
import { SelfPunchModal } from '../components/SelfPunchModal';
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
  const [selectedRunner, setSelectedRunner] = useState<RankedRunnerDto | null>(null);

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
  // `raceEnded` is the canonical "the race is over" signal: it fires
  // when either (a) wall-clock crosses `endsAt`, or (b) at most one
  // runner is still in-race (backyard rule — cf. `ranking.core.ts`).
  // Reading the banner gate off `edition.status === 'finished'` —
  // which is admin-managed and not auto-transitioned — left a UX gap
  // on PR #23: the race could be over per the leaderboard while the
  // page still rendered as live. The two signals can disagree
  // (admin-finished + race-not-yet-ended cannot happen in practice;
  // race-ended + admin-still-live happens every time the admin forgets
  // to click the transition). Trusting `raceEnded` collapses the gap.
  // See docs/dantotsus/race-end-banner-uses-computed-raceended.md.
  const raceEnded = standingsState.standings?.raceEnded === true;
  const isFinished = edition.status === 'finished' || raceEnded;
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
      {/* 2×2 grid via `grid-template-areas`: row 1 = countdown + trace
          (natural height of the countdown), row 2 = classement + profile
          (grows to fill the remaining viewport via `flex: 1`). Row tops
          align across columns. */}
      <div className="spectator-layout">
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
        <div className="card map-card">
          <div className="card-head">
            <h2 className="card-title">Tracé</h2>
            <span className="muted mono">
              {standings === null ? '' : `${standings.ranked.filter((entry) => entry.status.kind === 'in-race').length} en course`}
            </span>
          </div>
          <CourseMap edition={edition} ranked={standings?.ranked ?? []} now={new Date()} />
        </div>
        <div className="card classement-card">
          <div className="card-head">
            <h2 className="card-title">Classement</h2>
            {isLive ? <span className="live-pill">Live</span> : null}
          </div>
          <div className="card-body flush">
            <Leaderboard
              ranked={standings?.ranked ?? []}
              fastestLapSlugs={
                new Set((standings?.fastestLap ?? []).map((entry) => entry.runnerSlug))
              }
              onChipSelect={setSelectedRunner}
            />
          </div>
        </div>
        <div className="card profile-card">
          <div className="card-head">
            <h2 className="card-title">Profil</h2>
            <span className="muted mono">
              {Math.round(edition.gpx.elevationGainMeters)} m D+
            </span>
          </div>
          <ElevationProfile edition={edition} ranked={standings?.ranked ?? []} now={new Date()} />
        </div>
      </div>
      {selectedRunner === null ? null : (
        <SelfPunchModal
          runner={selectedRunner}
          editionSlug={edition.slug}
          onClose={() => setSelectedRunner(null)}
          onPunchPersisted={() => {
            // The standings poll auto-refreshes every 2 s; nothing to do
            // here on success beyond letting the user dismiss the modal.
          }}
        />
      )}
    </div>
  );
}
