import { apiClient } from '../api/client';
import { useResource } from '../data/useResource';
import { useStandings } from '../data/useStandingsPoll';
import { initialsAvatar } from '../domain/initials.utils';

interface RunnerFichePageProps {
  readonly editionSlug: string;
  readonly runnerSlug: string;
}

export function RunnerFichePage({ editionSlug, runnerSlug }: RunnerFichePageProps) {
  const editionState = useResource('edition:current', () => apiClient.getCurrentEdition());
  const standingsState = useStandings(editionSlug);
  const runnerState = useResource(`runner:${editionSlug}:${runnerSlug}`, () =>
    apiClient.getRunner(editionSlug, runnerSlug),
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

  return (
    <div className="main">
      <div className="card">
        <div className="card-head">
          <h2 className="card-title">Fiche coureur</h2>
          {edition !== null ? <span className="muted mono">{edition.displayName}</span> : null}
        </div>
        <div className="card-body row" style={{ gap: 'var(--d-5)' }}>
          <div
            className="avatar"
            style={{ background: avatar.backgroundColor, width: 64, height: 64, fontSize: 20 }}
          >
            {avatar.initials}
          </div>
          <div className="col">
            <strong style={{ fontSize: 20 }}>{runner.displayName}</strong>
            {runner.bib !== null ? (
              <span className="muted mono">Dossard #{runner.bib}</span>
            ) : null}
            {entry !== undefined ? (
              <span
                className={`status-pill ${entry.status.kind === 'in-race' ? 'in-race' : 'dnf'}`}
              >
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
    </div>
  );
}
