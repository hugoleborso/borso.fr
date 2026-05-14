import { useEffect, useState } from 'react';
import { ApiError, apiClient } from '../api/client';
import { CorrectionPanel } from '../components/admin/CorrectionPanel';
import { DnfCandidatesPanel } from '../components/admin/DnfCandidatesPanel';
import { RunnerAdminPanel } from '../components/admin/RunnerAdminPanel';
import { SetupPanel } from '../components/admin/SetupPanel';
import { useResource, invalidateResource } from '../data/useResource';
import { useStandings } from '../data/useStandingsPoll';
import { initialsAvatar } from '../domain/initials.utils';
import type { RankedRunnerDto, RaceEditionDto, RunnerDto } from '../domain/types';
import { recordAnalyticsEvent } from '../observability/sentry';

const RACE_CACHE_KEY = 'edition:current';

type LoginState = 'idle' | 'submitting' | 'authenticated' | 'denied' | 'rate-limited' | 'unknown-error';

function PinForm({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [pin, setPin] = useState('');
  const [state, setState] = useState<LoginState>('idle');

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setState('submitting');
    try {
      await apiClient.adminLogin(pin);
      setState('authenticated');
      onAuthenticated();
    } catch (error) {
      if (error instanceof ApiError && error.status === 429) setState('rate-limited');
      else if (error instanceof ApiError && error.status === 401) setState('denied');
      else setState('unknown-error');
    }
  }

  const message =
    state === 'denied'
      ? 'PIN invalide.'
      : state === 'rate-limited'
        ? 'Trop de tentatives. Réessayez dans 5 minutes.'
        : state === 'unknown-error'
          ? 'Connexion impossible. Réessayez.'
          : null;

  return (
    <form className="pin-form card" onSubmit={(event) => void handleSubmit(event)}>
      <div className="card-head">
        <h2 className="card-title">Admin</h2>
      </div>
      <div className="card-body col">
        <div className="field">
          <label className="field-label" htmlFor="pin">PIN</label>
          <input
            id="pin"
            type="password"
            className="input"
            value={pin}
            onChange={(event) => setPin(event.target.value)}
            autoComplete="current-password"
            required
            minLength={4}
          />
        </div>
        {message !== null ? <div className="error-text">{message}</div> : null}
        <button className="btn btn-primary" type="submit" disabled={state === 'submitting'}>
          {state === 'submitting' ? 'Connexion…' : 'Entrer'}
        </button>
      </div>
    </form>
  );
}

function formatPace(durationMs: number | null): string {
  if (durationMs === null || durationMs <= 0) return '—';
  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}'${String(seconds).padStart(2, '0')}"`;
}

function PunchPanel({
  edition,
  ranked,
  now,
  onMutated,
}: {
  readonly edition: RaceEditionDto;
  readonly ranked: readonly RankedRunnerDto[];
  readonly now: Date;
  readonly onMutated: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Optimistic punch set: slug+currentLoopIndex entries the orga just
  // tapped. Flips the tile to "Pointé·e" instantly without waiting for
  // the next standings poll. Cleared as soon as `entry.status.lastLoop`
  // catches up (or rolled back on API error).
  const [optimisticPunches, setOptimisticPunches] = useState<ReadonlySet<string>>(
    () => new Set<string>(),
  );

  const inRace = ranked.filter((entry) => entry.status.kind === 'in-race');

  // "Punched this loop?" = the runner's lastLoop matches the loop the race
  // is currently in. We derive it from elapsed/intervalMinutes rather than
  // adding a new API field — the server already computes lastLoop, so the
  // tile flips to "Pointé·e" as soon as the next standings poll lands.
  const startMs = new Date(edition.startsAt).getTime();
  const loopMs = Math.max(edition.intervalMinutes, 1) * 60_000;
  const elapsed = Math.max(0, now.getTime() - startMs);
  const currentLoopIndex = Math.floor(elapsed / loopMs) + 1;
  const progressInLoop = (elapsed % loopMs) / loopMs;
  const minutesLeft = Math.max(0, Math.ceil(((1 - progressInLoop) * loopMs) / 60_000));

  // Reset the optimistic set every time the race ticks into a new loop.
  // A "pending" punch from the previous hour is no longer relevant — the
  // server-confirmed `lastLoop` covers what stuck, and anything we missed
  // surfaces as `dnf:late` automatically. Without this, stale entries
  // would falsely paint runners as already-punched for the new loop.
  // The `void` keeps the value referenced so biome doesn't flag it as a
  // "useless dep" — we genuinely want the effect to re-run on each tick.
  useEffect(() => {
    void currentLoopIndex;
    setOptimisticPunches(new Set<string>());
  }, [currentLoopIndex]);

  async function handlePunch(runner: RunnerDto): Promise<void> {
    setBusy(runner.slug);
    setError(null);
    // Optimistic flip — tile turns "Pointé·e" before the round-trip lands,
    // so the orga can keep tapping the next bib without waiting on the
    // 2-second standings poll.
    setOptimisticPunches((previous) => {
      const next = new Set(previous);
      next.add(runner.slug);
      return next;
    });
    try {
      await apiClient.adminRegisterPunch({ editionSlug: edition.slug, runnerSlug: runner.slug });
      recordAnalyticsEvent('loop_punched', { editionSlug: edition.slug, runnerSlug: runner.slug });
      onMutated();
    } catch (caught) {
      // Roll the optimistic punch back so the tile flips out of the
      // "punched" state and the orga sees the error inline.
      setOptimisticPunches((previous) => {
        const next = new Set(previous);
        next.delete(runner.slug);
        return next;
      });
      if (caught instanceof ApiError && caught.status === 409) {
        setError(`${runner.displayName} a déjà pointé pour cette boucle.`);
      } else {
        setError(caught instanceof Error ? caught.message : 'Erreur inconnue.');
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="card">
      <div className="card-head">
        <h2 className="card-title">
          Pointage · boucle <span className="mono">{String(currentLoopIndex).padStart(2, '0')}</span>
        </h2>
        <span className="muted mono">
          top horaire dans {minutesLeft} min · {inRace.length} en course
        </span>
      </div>
      <div className="card-body" style={{ padding: 0 }}>
        {error !== null ? (
          <div className="error-text" style={{ padding: 'var(--d-3) var(--d-5)' }}>
            {error}
          </div>
        ) : null}
        {inRace.length === 0 ? (
          <div className="muted" style={{ padding: 'var(--d-5)' }}>
            Personne en course.
          </div>
        ) : (
          <div className="punch-grid">
            {inRace.map((entry) => {
              const avatar = initialsAvatar(entry.runner.displayName);
              const serverPunched =
                entry.status.kind === 'in-race' && entry.status.lastLoop >= currentLoopIndex;
              const punched = serverPunched || optimisticPunches.has(entry.runner.slug);
              const late = !punched && progressInLoop > 0.85;
              return (
                <button
                  type="button"
                  className={`punch-tile${punched ? ' punched' : ''}${late ? ' late' : ''}`}
                  key={entry.runner.slug}
                  onClick={() => void handlePunch(entry.runner)}
                  disabled={busy !== null}
                >
                  <span className="punch-check" aria-hidden>
                    ✓
                  </span>
                  <span className="punch-top">
                    <span className="avatar" style={{ background: avatar.backgroundColor }}>
                      {avatar.initials}
                    </span>
                    <span className="punch-id">
                      <span className="punch-bib">
                        #{entry.runner.bib === null ? '—' : String(entry.runner.bib).padStart(3, '0')}
                      </span>
                      <span className="punch-name">{entry.runner.displayName}</span>
                    </span>
                  </span>
                  <span className="punch-bottom">
                    <span className="punch-meta">
                      {punched
                        ? '✓ Pointé·e'
                        : entry.status.kind === 'in-race'
                          ? `${entry.status.lastLoop} boucle${entry.status.lastLoop > 1 ? 's' : ''}`
                          : '—'}
                    </span>
                    <span className="punch-pace">~{formatPace(entry.lastLoopDurationMs)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function FinishRacePrompt({
  edition,
  totalRunners,
}: {
  readonly edition: RaceEditionDto;
  readonly totalRunners: number;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFinish(): Promise<void> {
    if (
      !confirm(
        `Terminer la course ? Les ${totalRunners} dossards sont tous en DNF — le classement final sera figé.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiClient.adminTransitionEditionStatus(edition.slug, 'finished');
      invalidateResource('edition:current');
      invalidateResource('editions:all');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Erreur inconnue.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-finish-banner">
      <div className="admin-finish-banner__msg">
        <strong>Plus personne en course.</strong>
        <small>
          {totalRunners} coureur{totalRunners > 1 ? 's' : ''} en DNF. La course est terminée
          dans les faits.
        </small>
        {error !== null ? <div className="error-text">{error}</div> : null}
      </div>
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => void handleFinish()}
        disabled={busy}
      >
        {busy ? 'Mise à jour…' : 'Terminer la course'}
      </button>
    </div>
  );
}

type Tab = 'setup' | 'runners' | 'punch' | 'dnf' | 'corrections';

function TabButton({
  current,
  target,
  label,
  setTab,
}: {
  readonly current: Tab;
  readonly target: Tab;
  readonly label: string;
  readonly setTab: (tab: Tab) => void;
}) {
  return (
    <button
      type="button"
      className={current === target ? 'active' : ''}
      onClick={() => setTab(target)}
    >
      {label}
    </button>
  );
}

export function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [tab, setTab] = useState<Tab>('punch');
  const editionState = useResource(RACE_CACHE_KEY, () => apiClient.getCurrentEdition());
  const edition = editionState.value?.edition ?? null;
  const standingsState = useStandings(edition?.slug ?? '');
  const ranked = standingsState.standings?.ranked ?? [];

  if (!authenticated) {
    return (
      <div className="main">
        <PinForm onAuthenticated={() => setAuthenticated(true)} />
      </div>
    );
  }

  const inRaceCount = ranked.filter((entry) => entry.status.kind === 'in-race').length;
  const showFinishPrompt =
    edition !== null && edition.status === 'live' && ranked.length > 0 && inRaceCount === 0;

  return (
    <div className="main col">
      {showFinishPrompt && edition !== null ? (
        <FinishRacePrompt edition={edition} totalRunners={ranked.length} />
      ) : null}
      <nav className="nav" style={{ marginLeft: 0 }}>
        <TabButton current={tab} target="setup" label="Setup" setTab={setTab} />
        <TabButton current={tab} target="runners" label="Coureurs" setTab={setTab} />
        <TabButton current={tab} target="punch" label="Pointage" setTab={setTab} />
        <TabButton current={tab} target="dnf" label="DNF" setTab={setTab} />
        <TabButton current={tab} target="corrections" label="Corrections" setTab={setTab} />
      </nav>

      {tab === 'setup' ? <SetupPanel currentEdition={edition} /> : null}

      {edition === null && tab !== 'setup' ? (
        <div className="card">
          <div className="card-body muted">
            Aucune édition active. Allez sur l'onglet <strong>Setup</strong> pour en créer une.
          </div>
        </div>
      ) : null}

      {edition !== null && tab === 'runners' ? <RunnerAdminPanel edition={edition} /> : null}
      {edition !== null && tab === 'punch' ? (
        <PunchPanel
          edition={edition}
          ranked={ranked}
          now={new Date()}
          onMutated={() => invalidateResource(`standings:${edition.slug}`)}
        />
      ) : null}
      {edition !== null && tab === 'dnf' ? (
        <DnfCandidatesPanel edition={edition} ranked={ranked} />
      ) : null}
      {edition !== null && tab === 'corrections' ? <CorrectionPanel edition={edition} /> : null}
    </div>
  );
}
