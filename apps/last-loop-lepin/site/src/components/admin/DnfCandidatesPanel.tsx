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
 * Two halves on the same panel:
 *
 * - **DNF à valider** lists runners the system already projects as
 *   `dnf:late` (missed the top-of-hour). Confirming writes a
 *   `manual_dnf` row so the projection stops flipping back when a late
 *   punch could land.
 * - **Abandon volontaire** covers every other in-race runner. The orga
 *   marks them out *after* a closed loop — typically when the runner
 *   walks back to the corral and tells you they're done. We record DNF
 *   at the runner's last completed loop (`outAtLoop = lastLoop`) so the
 *   final ranking sees the right finish line.
 */
export function DnfCandidatesPanel({ edition, ranked }: DnfCandidatesPanelProps) {
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Two views of the same DNF set:
  //   - `lateCandidates` are runners the system *projected* as out (they
  //     missed the top horaire). They aren't manually validated yet, so
  //     the projection can flip back on a late punch — that's why we
  //     show the explicit "Valider DNF" button to lock it in.
  //   - `allDnfs` is the union of late + manual DNFs. Both need the
  //     "Le faire passer (1 h)" escape hatch (system pre-DNFed too
  //     eagerly OR the orga regrets a manual call) so the operator can
  //     bring a runner back into the race retroactively.
  const lateCandidates = ranked.filter(
    (entry) => entry.status.kind === 'dnf' && entry.status.reason === 'late',
  );
  const allDnfs = ranked.filter((entry) => entry.status.kind === 'dnf');
  const inRace = ranked.filter((entry) => entry.status.kind === 'in-race');

  async function confirmDnf(entry: RankedRunnerDto): Promise<void> {
    const outAtLoop =
      entry.status.kind === 'dnf' ? entry.status.outAtLoop : entry.status.lastLoop;
    setBusySlug(entry.runner.slug);
    setError(null);
    try {
      await apiClient.adminRecordDnf({
        editionSlug: edition.slug,
        runnerSlug: entry.runner.slug,
        outAtLoop,
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

  async function abandonVoluntarily(entry: RankedRunnerDto): Promise<void> {
    if (entry.status.kind !== 'in-race') return;
    const lastLoop = entry.status.lastLoop;
    if (
      !confirm(
        `Marquer ${entry.runner.displayName} en abandon (boucle ${lastLoop}) ? Le coureur disparaît du classement live.`,
      )
    ) {
      return;
    }
    await confirmDnf(entry);
  }

  async function catchupRunner(entry: RankedRunnerDto): Promise<void> {
    if (entry.status.kind !== 'dnf') return;
    const missedLoop = entry.status.outAtLoop + 1;
    if (
      !confirm(
        `Rattraper ${entry.runner.displayName} sur la boucle ${missedLoop} ? Temps par défaut 1 h ; le coureur revient en course et tu lui ajoutes ce pointage.`,
      )
    ) {
      return;
    }
    setBusySlug(entry.runner.slug);
    setError(null);
    try {
      await apiClient.adminCatchupPunch({
        editionSlug: edition.slug,
        runnerSlug: entry.runner.slug,
        loopIndex: missedLoop,
      });
      recordAnalyticsEvent('correction_applied', {
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
    <div className="col" style={{ gap: 'var(--d-4)' }}>
      <div className="card">
        <div className="card-head">
          <h2 className="card-title">DNF à valider</h2>
          <span className="muted mono">{lateCandidates.length} en attente</span>
        </div>
        <div className="card-body col">
          {error !== null ? <div className="error-text">{error}</div> : null}
          {lateCandidates.length === 0 ? (
            <div className="muted">Aucun coureur en attente de validation DNF.</div>
          ) : (
            lateCandidates.map((entry) => {
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
                  <div className="row" style={{ gap: 'var(--d-2)', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => void catchupRunner(entry)}
                      disabled={busySlug !== null}
                      title="Crédite la boucle suivante avec un temps d'1 h (limite haute). Le coureur ressort de DNF et reprend la course."
                    >
                      {busySlug === entry.runner.slug ? '…' : 'Le faire passer (1 h)'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => void confirmDnf(entry)}
                      disabled={busySlug !== null}
                    >
                      {busySlug === entry.runner.slug ? 'Validation…' : 'Valider DNF'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h2 className="card-title">Réintégrer un DNF</h2>
          <span className="muted mono">{allDnfs.length} DNF</span>
        </div>
        <div className="card-body col">
          <div className="muted" style={{ fontSize: 12 }}>
            Si on a pré-DNFé un coureur qui était en fait à temps, ou qu'on s'est trompé
            sur un abandon volontaire — un clic suffit pour le faire repasser. Lui crédite
            la boucle manquée avec un temps d'1 h (plafond) et retire le DNF.
          </div>
          {allDnfs.length === 0 ? (
            <div className="muted">Aucun DNF pour l'instant.</div>
          ) : (
            allDnfs.map((entry) => {
              const avatar = initialsAvatar(entry.runner.displayName);
              const outAtLoop = entry.status.kind === 'dnf' ? entry.status.outAtLoop : 0;
              const reason = entry.status.kind === 'dnf' ? entry.status.reason : 'late';
              return (
                <div className="leaderboard-row" key={`reinstate-${entry.runner.slug}`}>
                  <span className="rank mono">B{outAtLoop}</span>
                  <div className="row">
                    <span className="avatar" style={{ background: avatar.backgroundColor }}>
                      {avatar.initials}
                    </span>
                    <span className="runner-name">{entry.runner.displayName}</span>
                  </div>
                  <span className="loop-info">
                    {reason === 'manual' ? 'abandon manuel' : 'auto-DNF système'} · B{outAtLoop}
                  </span>
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => void catchupRunner(entry)}
                    disabled={busySlug !== null}
                  >
                    {busySlug === entry.runner.slug ? '…' : 'Le faire passer (1 h)'}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h2 className="card-title">Abandon volontaire</h2>
          <span className="muted mono">{inRace.length} en course</span>
        </div>
        <div className="card-body col">
          <div className="muted" style={{ fontSize: 12 }}>
            Pour un coureur qui jette l'éponge entre deux boucles. Marque DNF à la dernière
            boucle bouclée et le retire du live.
          </div>
          {inRace.length === 0 ? (
            <div className="muted">Personne en course.</div>
          ) : (
            inRace.map((entry) => {
              const avatar = initialsAvatar(entry.runner.displayName);
              const lastLoop = entry.status.kind === 'in-race' ? entry.status.lastLoop : 0;
              return (
                <div className="leaderboard-row" key={entry.runner.slug}>
                  <span className="rank mono">B{lastLoop}</span>
                  <div className="row">
                    <span className="avatar" style={{ background: avatar.backgroundColor }}>
                      {avatar.initials}
                    </span>
                    <span className="runner-name">{entry.runner.displayName}</span>
                  </div>
                  <span className="loop-info">
                    {entry.runner.bib === null ? '' : `#${entry.runner.bib} · `}dernière B
                    {lastLoop}
                  </span>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => void abandonVoluntarily(entry)}
                    disabled={busySlug !== null}
                  >
                    {busySlug === entry.runner.slug ? 'Validation…' : 'Marquer abandon'}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
