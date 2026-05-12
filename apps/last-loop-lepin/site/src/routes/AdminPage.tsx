import { useState } from 'react';
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

function PunchPanel({
  edition,
  ranked,
  onMutated,
}: {
  readonly edition: RaceEditionDto;
  readonly ranked: readonly RankedRunnerDto[];
  readonly onMutated: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const inRace = ranked.filter((entry) => entry.status.kind === 'in-race');

  async function handlePunch(runner: RunnerDto): Promise<void> {
    setBusy(runner.slug);
    setError(null);
    try {
      await apiClient.adminRegisterPunch({ editionSlug: edition.slug, runnerSlug: runner.slug });
      recordAnalyticsEvent('loop_punched', { editionSlug: edition.slug, runnerSlug: runner.slug });
      onMutated();
    } catch (caught) {
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
        <h2 className="card-title">Pointage</h2>
        <span className="muted mono">{inRace.length} en course</span>
      </div>
      <div className="card-body col">
        {error !== null ? <div className="error-text">{error}</div> : null}
        {inRace.length === 0 ? (
          <div className="muted">Personne en course.</div>
        ) : (
          inRace.map((entry) => {
            const avatar = initialsAvatar(entry.runner.displayName);
            return (
              <button
                type="button"
                className="btn"
                key={entry.runner.slug}
                onClick={() => void handlePunch(entry.runner)}
                disabled={busy !== null}
                style={{ justifyContent: 'flex-start' }}
              >
                <span className="avatar" style={{ background: avatar.backgroundColor }}>
                  {avatar.initials}
                </span>
                <span>{entry.runner.displayName}</span>
                <span className="muted mono" style={{ marginLeft: 'auto' }}>
                  Boucle {entry.status.kind === 'in-race' ? entry.status.lastLoop : '—'}
                </span>
              </button>
            );
          })
        )}
      </div>
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

  return (
    <div className="main col">
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
