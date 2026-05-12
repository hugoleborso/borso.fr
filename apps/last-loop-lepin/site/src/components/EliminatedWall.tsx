import { initialsAvatar } from '../domain/initials.utils';
import type { RankedRunnerDto } from '../domain/types';

interface EliminatedWallProps {
  readonly ranked: readonly RankedRunnerDto[];
}

export function EliminatedWall({ ranked }: EliminatedWallProps) {
  const eliminated = ranked.filter((entry) => entry.status.kind === 'dnf');
  if (eliminated.length === 0) {
    return <div className="card-body muted">Personne n'a encore craqué.</div>;
  }
  return (
    <div className="card-body">
      <div className="wall">
        {eliminated.map((entry) => {
          const avatar = initialsAvatar(entry.runner.displayName);
          return (
            <div className="wall-card" key={`${entry.runner.editionSlug}-${entry.runner.slug}`}>
              <div className="row">
                <span className="avatar" style={{ background: avatar.backgroundColor }}>
                  {avatar.initials}
                </span>
                <strong>{entry.runner.displayName}</strong>
              </div>
              <div className="muted mono" style={{ marginTop: 'var(--d-2)', fontSize: '11px' }}>
                Sorti boucle {entry.status.kind === 'dnf' ? entry.status.outAtLoop : '—'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
