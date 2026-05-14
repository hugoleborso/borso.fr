import { initialsAvatar } from '../domain/initials.utils';
import type { RankedRunnerDto } from '../domain/types';

interface LeaderboardProps {
  readonly ranked: readonly RankedRunnerDto[];
}

/**
 * Wall-clock time of the latest event for a runner: their last validated
 * loop punch (in-race) or the moment they fell out (DNF). Read off the
 * server-supplied `lastFinishedAt` ISO so timezones don't drift between
 * client and server — `toLocaleTimeString` formats in the browser locale.
 * Returns "—" for runners who never crossed the line (e.g. dnf:late at
 * loop 0).
 */
function formatLastEventTime(entry: RankedRunnerDto): string {
  if (entry.lastFinishedAt === null) return '—';
  return new Date(entry.lastFinishedAt).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
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
              <span className="loop-info">{formatLastEventTime(entry)}</span>
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
