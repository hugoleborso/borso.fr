import { buildRunnerAvatar } from '../domain/runner-avatar.utils';
import type { RaceEditionDto, RankedRunnerDto } from '../domain/types';
import { indexTrack, runnerDistanceFraction } from './course-map.utils';
import { buildProfileGeometry } from './elevation-profile.utils';

interface ElevationProfileProps {
  readonly edition: RaceEditionDto;
  readonly ranked: readonly RankedRunnerDto[];
  /** Wall-clock used to drive the runner pastilles' X position. */
  readonly now: Date;
}

// SVG `viewBox` dimensions. The container CSS scales the SVG to the
// card width via `preserveAspectRatio="none"`, so the pixel dimensions
// here are just internal coordinates — the only constraint is the
// aspect ratio (roughly 4:1 matches the map card under it).
const PROFILE_VIEWBOX_WIDTH = 800;
const PROFILE_VIEWBOX_HEIGHT = 200;
const PROFILE_MIN_HEIGHT_PX = 200;
const PROFILE_AVATAR_RADIUS_PX = 10;
const PROFILE_AVATAR_FONT_PX = 11;
const PROFILE_GRADIENT_ID = 'elevation-fill';
const PROFILE_PASTILLE_SHADOW_ID = 'elevation-pastille-shadow';
const PROFILE_PLACEHOLDER_LABEL = 'Profil indisponible';

/**
 * SVG-rendered elevation profile that sits under the course map and
 * carries one pastille per in-race runner, positioned by the same
 * `distanceFraction` the map uses. Pure render — no `useEffect`, no
 * `useState`, no `useRef`. The poll-driven re-render of the parent
 * (`SpectatorPage`) is the only refresh mechanism.
 *
 * Falls back to a muted placeholder when `pointElevations` is absent
 * (the source GPX lacked `<ele>` on at least one trkpt). The card body
 * keeps the same min-height so the grid layout doesn't reflow when the
 * placeholder takes over.
 */
export function ElevationProfile({ edition, ranked, now }: ElevationProfileProps) {
  const pointElevations = edition.gpx.trackJson.pointElevations;
  const points = edition.gpx.trackJson.points;

  if (pointElevations === undefined || pointElevations.length < 2 || points.length < 2) {
    return (
      <div
        className="card-body flush elevation-profile"
        style={{ minHeight: PROFILE_MIN_HEIGHT_PX }}
      >
        <div
          className="muted"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: PROFILE_MIN_HEIGHT_PX,
          }}
        >
          {PROFILE_PLACEHOLDER_LABEL}
        </div>
      </div>
    );
  }

  const cumulativeDistances = indexTrack(points).cumulative;
  const geometry = buildProfileGeometry(
    pointElevations,
    cumulativeDistances,
    PROFILE_VIEWBOX_WIDTH,
    PROFILE_VIEWBOX_HEIGHT,
  );
  const nowMs = now.getTime();
  const timingInputs = {
    status: edition.status,
    startsAt: edition.startsAt,
    intervalMinutes: edition.intervalMinutes,
  };

  return (
    <div
      className="card-body flush elevation-profile"
      style={{ minHeight: PROFILE_MIN_HEIGHT_PX }}
    >
      <svg
        role="img"
        aria-label="Profil de dénivelé de la boucle"
        viewBox={`0 0 ${PROFILE_VIEWBOX_WIDTH} ${PROFILE_VIEWBOX_HEIGHT}`}
        preserveAspectRatio="none"
        width="100%"
        height={PROFILE_MIN_HEIGHT_PX}
      >
        <defs>
          <linearGradient id={PROFILE_GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent, #f43f5e)" stopOpacity="0.6" />
            <stop offset="100%" stopColor="var(--accent, #f43f5e)" stopOpacity="0" />
          </linearGradient>
          {/* Drop shadow on the runner pastilles — matches the
              `box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25)` on `.map-avatar`
              so the two surfaces share a visual language. */}
          <filter id={PROFILE_PASTILLE_SHADOW_ID} x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.2" floodOpacity="0.35" />
          </filter>
        </defs>
        <polygon points={geometry.areaPolygonPoints} fill={`url(#${PROFILE_GRADIENT_ID})`} />
        <polyline
          points={geometry.linePolylinePoints}
          fill="none"
          stroke="var(--accent, #f43f5e)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {ranked.map((entry) => {
          const computed = runnerDistanceFraction(timingInputs, entry, nowMs);
          if (computed === null) return null;
          if (computed.restingAtCorral) return null;
          const avatar = buildRunnerAvatar({
            displayName: entry.runner.displayName,
            photoUrl: entry.runner.photoUrl,
          });
          const fallback = avatar.kind === 'photo' ? avatar.fallback : avatar;
          const centerX = computed.fraction * PROFILE_VIEWBOX_WIDTH;
          const centerY = geometry.yAt(computed.fraction);
          const runnerKey = `${entry.runner.editionSlug}-${entry.runner.slug}`;
          /* Two things happen on the wrapper `<g>`:
           *
           *   1. Smooth advancement. The `transform="translate(x y)"`
           *      attribute is set on every render; React keeps the same
           *      DOM node across renders thanks to the stable key, so
           *      CSS interpolates the transform between polls (see
           *      `.runner-pastille` in `map.css`). Inner shapes sit at
           *      the origin so the wrapper's translate is the only
           *      motion.
           *
           *   2. Photo cascade without JS. When the runner has a
           *      `photoUrl`, we render an `<image>` clipped by a per-
           *      pastille `<clipPath>` LAYERED OVER the initials circle.
           *      A broken/loading image lets the circle show through —
           *      free fallback, no `onError` handler needed (SVG `error`
           *      events are not cross-browser reliable for hiding the
           *      image element). */
          return (
            <g
              key={runnerKey}
              className="runner-pastille"
              transform={`translate(${centerX} ${centerY})`}
              filter={`url(#${PROFILE_PASTILLE_SHADOW_ID})`}
            >
              <circle
                cx={0}
                cy={0}
                r={PROFILE_AVATAR_RADIUS_PX}
                fill={fallback.backgroundColor}
                stroke="var(--bg)"
                strokeWidth="2"
                data-runner-slug={entry.runner.slug}
              />
              <text
                x={0}
                y={0}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={PROFILE_AVATAR_FONT_PX}
                fontWeight="700"
                fill="var(--accent-ink, #111)"
              >
                {fallback.initials}
              </text>
              {avatar.kind === 'photo' ? (
                <>
                  <defs>
                    <clipPath id={`profile-avatar-clip-${runnerKey}`}>
                      <circle cx={0} cy={0} r={PROFILE_AVATAR_RADIUS_PX} />
                    </clipPath>
                  </defs>
                  <image
                    href={avatar.url}
                    x={-PROFILE_AVATAR_RADIUS_PX}
                    y={-PROFILE_AVATAR_RADIUS_PX}
                    width={PROFILE_AVATAR_RADIUS_PX * 2}
                    height={PROFILE_AVATAR_RADIUS_PX * 2}
                    clipPath={`url(#profile-avatar-clip-${runnerKey})`}
                    preserveAspectRatio="xMidYMid slice"
                    data-runner-slug={entry.runner.slug}
                    data-surface="profile"
                  />
                </>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
