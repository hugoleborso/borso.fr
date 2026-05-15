import { initialsAvatar } from '../domain/initials.utils';
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
          const avatar = initialsAvatar(entry.runner.displayName);
          const centerX = computed.fraction * PROFILE_VIEWBOX_WIDTH;
          const centerY = geometry.yAt(computed.fraction);
          /* Smooth advancement: place the pastille via the `transform`
           * attribute on a wrapper `<g>` and let CSS transition the
           * transform property. React keeps the same DOM node across
           * polls thanks to the stable key, so the transition runs from
           * the previous translate to the new one on every 2 s standings
           * poll. The class `runner-pastille` carries the transition
           * declaration (see `map.css`). The inner shapes sit at the
           * origin so the wrapper's translate is the only motion. */
          return (
            <g
              key={`${entry.runner.editionSlug}-${entry.runner.slug}`}
              className="runner-pastille"
              transform={`translate(${centerX} ${centerY})`}
              filter={`url(#${PROFILE_PASTILLE_SHADOW_ID})`}
            >
              <circle
                cx={0}
                cy={0}
                r={PROFILE_AVATAR_RADIUS_PX}
                fill={avatar.backgroundColor}
                stroke="var(--bg)"
                strokeWidth="2"
              />
              <text
                x={0}
                y={0}
                textAnchor="middle"
                /* `dominant-baseline="central"` centres SVG text vertically
                 * on its anchor across every browser this app targets
                 * (Chromium + Firefox). Without it, baseline drift on
                 * different glyphs would push 2-letter initials below
                 * the circle's centre. */
                dominantBaseline="central"
                fontSize={PROFILE_AVATAR_FONT_PX}
                fontWeight="700"
                fill="var(--accent-ink, #111)"
              >
                {avatar.initials}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
