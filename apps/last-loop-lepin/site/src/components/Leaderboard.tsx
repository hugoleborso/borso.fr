import { initialsAvatar } from '../domain/initials.utils';
import type { RankedRunnerDto } from '../domain/types';

interface LeaderboardProps {
  readonly ranked: readonly RankedRunnerDto[];
  /**
   * Slugs of the runners holding the edition's fastest-lap record.
   * Built by the parent during render from `standings.fastestLap`; we
   * read it per chip to decide whether to render the violet badge.
   * Defaults to an empty set so legacy callers compile.
   */
  readonly fastestLapSlugs?: ReadonlySet<string>;
  /**
   * Tap on a chip — handled by the parent (typically the spectator page),
   * which opens the self-punch modale. Omitted on screens where chips are
   * not interactive (the retransmission display, e.g.).
   */
  readonly onChipSelect?: (entry: RankedRunnerDto) => void;
}

/**
 * Inline SVG chronometer for the fastest-lap badge. Inline rather than an
 * asset file so the badge stays accessible (the surrounding `<span>` can
 * carry a `<title>` for screen readers) and matches the repo convention
 * of no `*.svg` files under `site/src/`.
 */
function FastestLapBadge() {
  return (
    <span className="leaderboard-chip__fastest-lap-badge">
      {/* SVG `<title>` supplies the accessible name to screen readers
       * without needing role/aria on the wrapper `<span>` itself. */}
      <svg viewBox="0 0 24 24" role="img">
        <title>Meilleur tour de l'édition</title>
        <path d="M15 1H9v2h6V1zm-4 13h2V8h-2v6zm8.03-6.61l1.42-1.42c-.43-.51-.9-.99-1.41-1.41l-1.42 1.42C16.07 4.74 14.12 4 12 4c-4.97 0-9 4.03-9 9s4.02 9 9 9 9-4.03 9-9c0-2.12-.74-4.07-1.97-5.61zM12 20c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z" />
      </svg>
    </span>
  );
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

const EMPTY_FASTEST_LAP_SLUGS: ReadonlySet<string> = new Set();

export function Leaderboard({ ranked, fastestLapSlugs, onChipSelect }: LeaderboardProps) {
  if (ranked.length === 0) {
    return (
      <div className="card-body muted">Aucun coureur inscrit pour l'instant.</div>
    );
  }
  const decoratedSlugs = fastestLapSlugs ?? EMPTY_FASTEST_LAP_SLUGS;
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
        const hasFastestLap = decoratedSlugs.has(entry.runner.slug);
        const chipContent = (
          <>
            {hasFastestLap ? <FastestLapBadge /> : null}
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
