import { useState } from 'react';
import { apiClient } from '../../api/client';
import { invalidateResource, useResource } from '../../data/useResource';
import { recordAnalyticsEvent } from '../../observability/sentry';
import type { RaceEditionDto, RunnerDto } from '../../domain/types';

interface CorrectionPanelProps {
  readonly edition: RaceEditionDto;
}

function formatHourMinute(iso: string): string {
  const date = new Date(iso);
  return `${`${date.getHours()}`.padStart(2, '0')}:${`${date.getMinutes()}`.padStart(2, '0')}`;
}

export function CorrectionPanel({ edition }: CorrectionPanelProps) {
  const rosterState = useResource(`runners:${edition.slug}`, () => apiClient.listRunners(edition.slug));
  const roster: readonly RunnerDto[] = rosterState.value?.runners ?? [];

  const [busyPunchId, setBusyPunchId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openedRunner, setOpenedRunner] = useState<string | null>(null);

  return (
    <div className="card">
      <div className="card-head">
        <h2 className="card-title">Corrections</h2>
        <span className="muted mono">annuler ou réajuster un pointage</span>
      </div>
      <div className="card-body col">
        {error !== null ? <div className="error-text">{error}</div> : null}
        {roster.length === 0 ? (
          <div className="muted">Aucun coureur — pas de pointage à corriger.</div>
        ) : (
          roster.map((runner) => (
            <RunnerRow
              key={runner.slug}
              runner={runner}
              editionSlug={edition.slug}
              opened={openedRunner === runner.slug}
              onToggle={() => setOpenedRunner((current) => (current === runner.slug ? null : runner.slug))}
              busyPunchId={busyPunchId}
              setBusyPunchId={setBusyPunchId}
              setError={setError}
              formatHourMinute={formatHourMinute}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface RunnerRowProps {
  readonly runner: RunnerDto;
  readonly editionSlug: string;
  readonly opened: boolean;
  readonly onToggle: () => void;
  readonly busyPunchId: string | null;
  readonly setBusyPunchId: (id: string | null) => void;
  readonly setError: (message: string | null) => void;
  readonly formatHourMinute: (iso: string) => string;
}

function RunnerRow({
  runner,
  editionSlug,
  opened,
  onToggle,
  busyPunchId,
  setBusyPunchId,
  setError,
  formatHourMinute,
}: RunnerRowProps) {
  const punchesKey = `runner-punches:${editionSlug}:${runner.slug}`;
  const punchesState = useResource(punchesKey, () =>
    apiClient.listRunnerPunches(editionSlug, runner.slug),
  );
  const punches = punchesState.value?.punches ?? [];

  async function voidPunch(id: string): Promise<void> {
    setBusyPunchId(id);
    setError(null);
    try {
      await apiClient.adminVoidPunch(id);
      recordAnalyticsEvent('correction_applied', { editionSlug, punchId: id });
      invalidateResource(punchesKey);
      invalidateResource(`standings:${editionSlug}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Erreur inconnue.');
    } finally {
      setBusyPunchId(null);
    }
  }

  return (
    <div className="col" style={{ gap: 'var(--d-2)' }}>
      <button
        type="button"
        className="btn"
        onClick={onToggle}
        style={{ justifyContent: 'space-between' }}
      >
        <span>{runner.displayName}</span>
        <span className="muted mono">{punches.filter((punch) => punch.voidedAt === null).length} boucle(s)</span>
      </button>
      {opened ? (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {punches.length === 0 ? (
            <li className="muted" style={{ padding: '6px 0' }}>Aucun pointage.</li>
          ) : (
            punches.map((punch) => (
              <li key={punch.id} className="leaderboard-row">
                <span className="rank mono">B{punch.loopIndex}</span>
                <span className="muted mono">{formatHourMinute(punch.finishedAt)}</span>
                <span className={`status-pill ${punch.voidedAt === null ? 'in-race' : 'dnf'}`}>
                  {punch.voidedAt === null ? 'valide' : 'annulé'}
                </span>
                {punch.voidedAt === null ? (
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => void voidPunch(punch.id)}
                    disabled={busyPunchId !== null}
                  >
                    Annuler
                  </button>
                ) : (
                  <span className="muted mono">—</span>
                )}
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
