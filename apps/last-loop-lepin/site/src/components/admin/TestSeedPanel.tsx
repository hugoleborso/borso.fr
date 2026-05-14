import { useState } from 'react';
import { apiClient } from '../../api/client';
import { invalidateResource } from '../../data/useResource';

type Fixture = 'race-mid-loop-3' | 'top-with-dnf-candidates' | 'race-finished';

interface SeedButton {
  readonly fixture: Fixture;
  readonly label: string;
  readonly description: string;
}

const FIXTURES: readonly SeedButton[] = [
  {
    fixture: 'race-mid-loop-3',
    label: 'Course live — mi-parcours',
    description: '4 coureurs, partis il y a 3 h, Alice mène avec 3 boucles validées.',
  },
  {
    fixture: 'top-with-dnf-candidates',
    label: 'Top horaire — 2 DNF candidats',
    description: 'Loop 1 vient de fermer, Carla + Dan en retard (candidats DNF).',
  },
  {
    fixture: 'race-finished',
    label: 'Course terminée',
    description: 'Course de 16 h finie, Alice a survécu 5 boucles, autres DNF.',
  },
];

/**
 * Wired only when `VITE_STAGE !== 'prod'`. POSTs to `/api/__test/seed` —
 * the backend mounts that route ONLY when `LASTLOOP_ALLOW_TEST_SEED='1'`,
 * which CDK sets on every stage except prod. Even if a curious admin
 * bypassed the env check on the front, the backend would still 404 in
 * prod.
 *
 * Seeded data lives under `lepin-2026`. Switching between fixtures
 * clears the previous run's punches + DNFs so the standings stay
 * coherent.
 */
export function TestSeedPanel() {
  const [busy, setBusy] = useState<Fixture | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [last, setLast] = useState<Fixture | null>(null);

  async function seed(fixture: Fixture): Promise<void> {
    setBusy(fixture);
    setError(null);
    try {
      await apiClient.adminSeedFixture(fixture);
      setLast(fixture);
      invalidateResource('edition:current');
      invalidateResource('editions:all');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Erreur inconnue.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="card">
      <div className="card-head">
        <h2 className="card-title">Démo / Tests</h2>
        <span className="muted mono">Charge un scénario complet sur `lepin-2026`</span>
      </div>
      <div className="card-body col">
        <div className="muted" style={{ fontSize: 12 }}>
          Disponible uniquement hors prod. Remplace les pointages + DNF de l'édition `lepin-2026` ;
          recrée l'édition si elle n'existe pas. Utile pour tester l'UI live sans attendre des
          vrais pointages.
        </div>
        {FIXTURES.map((entry) => (
          <button
            type="button"
            key={entry.fixture}
            className={`btn ${last === entry.fixture ? 'btn-primary' : ''}`}
            onClick={() => void seed(entry.fixture)}
            disabled={busy !== null}
            style={{ justifyContent: 'flex-start', textAlign: 'left' }}
          >
            <div className="col" style={{ gap: 2, alignItems: 'flex-start' }}>
              <strong>{busy === entry.fixture ? 'Chargement…' : entry.label}</strong>
              <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>
                {entry.description}
              </span>
            </div>
          </button>
        ))}
        {error !== null ? <div className="error-text">{error}</div> : null}
      </div>
    </div>
  );
}
