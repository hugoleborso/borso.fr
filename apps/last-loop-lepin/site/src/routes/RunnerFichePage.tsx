import { apiClient } from '../api/client';
import { useResource } from '../data/useResource';
import { useStandings } from '../data/useStandingsPoll';
import { initialsAvatar } from '../domain/initials.utils';
import type { LoopPunchDto } from '../domain/types';

interface RunnerFichePageProps {
  readonly editionSlug: string;
  readonly runnerSlug: string;
}

function formatHourMinute(iso: string): string {
  const date = new Date(iso);
  return `${`${date.getHours()}`.padStart(2, '0')}:${`${date.getMinutes()}`.padStart(2, '0')}`;
}

function formatDurationMs(ms: number): string {
  if (ms < 0) return '—';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${`${minutes}`.padStart(2, '0')}:${`${seconds}`.padStart(2, '0')}`;
}

function deriveLoopDurations(
  raceStartIso: string | undefined,
  punches: readonly LoopPunchDto[],
): ReadonlyArray<{ loopIndex: number; finishedAt: string; durationMs: number; voided: boolean }> {
  const validSorted = punches
    .filter((punch) => punch.voidedAt === null)
    .toSorted((left, right) => left.loopIndex - right.loopIndex);
  const startMs = raceStartIso === undefined ? 0 : new Date(raceStartIso).getTime();
  let previousMs = startMs;
  return validSorted.map((punch) => {
    const finishedMs = new Date(punch.finishedAt).getTime();
    const durationMs = finishedMs - previousMs;
    previousMs = finishedMs;
    return {
      loopIndex: punch.loopIndex,
      finishedAt: punch.finishedAt,
      durationMs,
      voided: punch.voidedAt !== null,
    };
  });
}

export function RunnerFichePage({ editionSlug, runnerSlug }: RunnerFichePageProps) {
  const editionState = useResource('edition:current', () => apiClient.getCurrentEdition());
  const standingsState = useStandings(editionSlug);
  const runnerState = useResource(`runner:${editionSlug}:${runnerSlug}`, () =>
    apiClient.getRunner(editionSlug, runnerSlug),
  );
  const punchesState = useResource(
    `runner-punches:${editionSlug}:${runnerSlug}`,
    () => apiClient.listRunnerPunches(editionSlug, runnerSlug),
  );

  if (runnerState.error !== null) {
    return (
      <div className="main">
        <div className="card">
          <div className="card-body error-text">Coureur introuvable.</div>
        </div>
      </div>
    );
  }

  const runner = runnerState.value?.runner ?? null;
  if (runner === null) {
    return (
      <div className="main">
        <div className="card">
          <div className="card-body muted">Chargement…</div>
        </div>
      </div>
    );
  }

  const avatar = initialsAvatar(runner.displayName);
  const standings = standingsState.standings;
  const entry = standings?.ranked.find((row) => row.runner.slug === runnerSlug);
  const edition = editionState.value?.edition ?? null;
  const punches = punchesState.value?.punches ?? [];
  const loopHistory = deriveLoopDurations(edition?.startsAt, punches);

  return (
    <div className="main col">
      <div className="card">
        <div className="card-head">
          <h2 className="card-title">Fiche coureur</h2>
          {edition !== null ? <span className="muted mono">{edition.displayName}</span> : null}
        </div>
        <div className="card-body row" style={{ gap: 'var(--d-5)', flexWrap: 'wrap' }}>
          <div
            className="avatar"
            style={{ background: avatar.backgroundColor, width: 64, height: 64, fontSize: 20 }}
          >
            {avatar.initials}
          </div>
          <div className="col">
            <strong style={{ fontSize: 20 }}>{runner.displayName}</strong>
            {runner.bib !== null ? <span className="muted mono">Dossard #{runner.bib}</span> : null}
            {entry !== undefined ? (
              <span className={`status-pill ${entry.status.kind === 'in-race' ? 'in-race' : 'dnf'}`}>
                {entry.status.kind === 'in-race'
                  ? `En course · boucle ${entry.status.lastLoop}`
                  : `DNF · boucle ${entry.status.outAtLoop}`}
              </span>
            ) : null}
            <span className="muted">
              Rang actuel : {entry === undefined ? '—' : entry.rank === 'ex-aequo' ? 'ex-æquo' : entry.rank}
            </span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h2 className="card-title">Historique des boucles</h2>
          <span className="muted mono">{loopHistory.length} validée{loopHistory.length === 1 ? '' : 's'}</span>
        </div>
        <div className="card-body flush">
          {loopHistory.length === 0 ? (
            <div className="card-body muted">Aucune boucle pointée pour le moment.</div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {loopHistory.map((loop) => (
                <li key={loop.loopIndex} className="leaderboard-row">
                  <span className="rank mono">B{loop.loopIndex}</span>
                  <span className="muted mono">Finie à {formatHourMinute(loop.finishedAt)}</span>
                  <span className="loop-info">Δ {formatDurationMs(loop.durationMs)}</span>
                  <span className="status-pill in-race">valide</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
