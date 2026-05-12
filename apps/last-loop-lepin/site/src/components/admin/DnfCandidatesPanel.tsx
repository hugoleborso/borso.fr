import { useState } from 'react';
import { apiClient } from '../../api/client';
import { invalidateResource } from '../../data/useResource';
import { initialsAvatar } from '../../domain/initials.utils';
import { recordAnalyticsEvent } from '../../observability/sentry';
import type { RankedRunnerDto, RaceEditionDto } from '../../domain/types';

interface DnfCandidatesPanelProps {
  readonly edition: RaceEditionDto;
  readonly ranked: readonly RankedRunnerDto[];
}

/**
 * Surfaces the runners the system thinks should be DNFed and lets the
 * orga validate one by one. A candidate is a runner whose status is
 * already `dnf:late` (system projection) — the orga confirms by clicking
 * "valider DNF", which writes a `manual_dnf` row. Without confirmation,
 * the projection re-evaluates every poll cycle and could flip back if a
 * late punch lands.
 */
export function DnfCandidatesPanel({ edition, ranked }: DnfCandidatesPanelProps) {
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const candidates = ranked.filter(
    (entry) => entry.status.kind === 'dnf' && entry.status.reason === 'late',
  );

  async function confirmDnf(entry: RankedRunnerDto): Promise<void> {
    if (entry.status.kind !== 'dnf') return;
    setBusySlug(entry.runner.slug);
    setError(null);
    try {
      await apiClient.adminRecordDnf({
        editionSlug: edition.slug,
        runnerSlug: entry.runner.slug,
        outAtLoop: entry.status.outAtLoop,
        reason: 'manual',
      });
      recordAnalyticsEvent('dnf_validated', {
        editionSlug: edition.slug,
        runnerSlug: entry.runner.slug,
      });
      invalidateResource(`standings:${edition.slug}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Erreur inconnue.');
    } finally {
      setBusySlug(null);
    }
  }

  return (
    <div className="card">
      <div className="card-head">
        <h2 className="card-title">DNF à valider</h2>
        <span className="muted mono">{candidates.length} en attente</span>
      </div>
      <div className="card-body col">
        {error !== null ? <div className="error-text">{error}</div> : null}
        {candidates.length === 0 ? (
          <div className="muted">Aucun coureur en attente de validation DNF.</div>
        ) : (
          candidates.map((entry) => {
            const avatar = initialsAvatar(entry.runner.displayName);
            const outAtLoop = entry.status.kind === 'dnf' ? entry.status.outAtLoop : 0;
            return (
              <div className="leaderboard-row" key={entry.runner.slug}>
                <span className="rank mono">B{outAtLoop}</span>
                <div className="row">
                  <span className="avatar" style={{ background: avatar.backgroundColor }}>
                    {avatar.initials}
                  </span>
                  <span className="runner-name">{entry.runner.displayName}</span>
                </div>
                <span className="loop-info">Manqué le top après B{outAtLoop}</span>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => void confirmDnf(entry)}
                  disabled={busySlug !== null}
                >
                  {busySlug === entry.runner.slug ? 'Validation…' : 'Valider DNF'}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
