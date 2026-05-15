import { initialsAvatar } from '../domain/initials.utils';
import type { RankedRunnerDto } from '../domain/types';

interface LeaderboardProps {
  readonly ranked: readonly RankedRunnerDto[];
  /**
   * Tap on a chip — handled by the parent (typically the spectator page),
   * which opens the self-punch modale. Omitted on screens where chips are
   * not interactive (the retransmission display, e.g.).
   */
  readonly onChipSelect?: (entry: RankedRunnerDto) => void;
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

export function Leaderboard({ ranked, onChipSelect }: LeaderboardProps) {
  if (ranked.length === 0) {
    return (
      <div className="card-body muted">Aucun coureur inscrit pour l'instant.</div>
    );
  }
  // CSS multi-column flow gives a Pinterest-style "masonry" layout
  // without the experimental `grid-template-rows: masonry` — chips break
  // vertically inside each column at whatever height they need, and
  // column edges aren't forced to align across rows. `column-fill: balance`
  // makes the columns roughly the same height even when chip counts vary.
  return (
    <div className="leaderboard-chips">
      {ranked.map((entry) => {
        const avatar = initialsAvatar(entry.runner.displayName);
        const isDnf = entry.status.kind === 'dnf';
        const isInteractive = onChipSelect !== undefined;
        const chipContent = (
          <>
            <div className="leaderboard-chip__head">
              <span className="leaderboard-chip__rank mono">
                {entry.rank === 'ex-aequo' ? '=' : entry.rank}
              </span>
              <span className="avatar" style={{ background: avatar.backgroundColor }}>
                {avatar.initials}
              </span>
              <span className="leaderboard-chip__name">{entry.runner.displayName}</span>
            </div>
            <div className="leaderboard-chip__foot">
              <span className={`status-pill ${isDnf ? 'dnf' : 'in-race'}`}>
                {describeStatus(entry)}
              </span>
              <span className="leaderboard-chip__time mono">{formatLastEventTime(entry)}</span>
            </div>
          </>
        );
        const chipClassName = `leaderboard-chip${isDnf ? ' leaderboard-chip--dnf' : ''}`;
        const key = `${entry.runner.editionSlug}-${entry.runner.slug}`;
        // `<button>` over `<div>` only when the parent gave us a handler.
        // This keeps the retransmission screen (where no handler is supplied)
        // structurally identical to before and prevents an inert button from
        // catching keyboard focus on a non-tactile display.
        return isInteractive ? (
          <button
            type="button"
            className={chipClassName}
            key={key}
            data-testid="leaderboard-chip"
            onClick={() => onChipSelect(entry)}
          >
            {chipContent}
          </button>
        ) : (
          <div className={chipClassName} key={key}>
            {chipContent}
          </div>
        );
      })}
    </div>
  );
}
