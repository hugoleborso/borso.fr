import { initialsAvatar } from '../domain/initials.utils';
import type { RankedRunnerDto } from '../domain/types';

interface LeaderboardProps {
  readonly ranked: readonly RankedRunnerDto[];
}

function formatLoopDuration(ms: number | null): string {
  if (ms === null) return '—';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number): string => `${value}`.padStart(2, '0');
  return `${pad(minutes)}:${pad(seconds)}`;
}

function describeStatus(entry: RankedRunnerDto): string {
  if (entry.status.kind === 'in-race') return `Boucle ${entry.status.lastLoop}`;
  return `DNF · B${entry.status.outAtLoop}`;
}

export function Leaderboard({ ranked }: LeaderboardProps) {
  return (
    <div className="leaderboard">
      {ranked.length === 0 ? (
        <div className="card-body muted">Aucun coureur inscrit pour l'instant.</div>
      ) : (
        ranked.map((entry) => {
          const avatar = initialsAvatar(entry.runner.displayName);
          return (
            <div className="leaderboard-row" key={`${entry.runner.editionSlug}-${entry.runner.slug}`}>
              <span className="rank mono">{entry.rank === 'ex-aequo' ? '=' : entry.rank}</span>
              <div className="row">
                <span className="avatar" style={{ background: avatar.backgroundColor }}>
                  {avatar.initials}
                </span>
                <span className="runner-name">{entry.runner.displayName}</span>
              </div>
              <span className="loop-info">{formatLoopDuration(entry.lastLoopDurationMs)}</span>
              <span className={`status-pill ${entry.status.kind === 'in-race' ? 'in-race' : 'dnf'}`}>
                {describeStatus(entry)}
              </span>
            </div>
          );
        })
      )}
    </div>
  );
}
