import { useTranslation } from 'react-i18next';
import type { RaceEditionDto, RankedRunnerDto } from '../../lib/race.types';
import { Show } from '../atoms/Show';
import { indexTrack } from './course-map.utils';
import { hasElevationSamples, listElevationPastilles } from './elevation-pastilles.core';
import { buildProfileGeometry } from './elevation-profile.utils';

interface ElevationProfileProps {
  readonly edition: RaceEditionDto;
  readonly ranked: readonly RankedRunnerDto[];
  /** Wall clock driving each runner pastille along the X axis. */
  readonly now: Date;
}

// The container scales the SVG to the card width, so these are internal
// coordinates and only their ratio matters. Four to one matches the map card
// under it.
const VIEWBOX_WIDTH = 800;
const VIEWBOX_HEIGHT = 200;
const MIN_HEIGHT_PX = 200;
const AVATAR_RADIUS_PX = 10;
const AVATAR_FONT_PX = 11;
const GRADIENT_ID = 'elevation-fill';
const PASTILLE_SHADOW_ID = 'elevation-pastille-shadow';
const EMPTY_ELEVATIONS: readonly number[] = [];

const FRAME_STYLE = { minHeight: MIN_HEIGHT_PX } as const;
const PLACEHOLDER_STYLE = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: MIN_HEIGHT_PX,
} as const;

/**
 * The loop's elevation curve with one pastille per running runner, placed by
 * the same along the track fraction the map uses. A pure render: the parent's
 * poll driven re-render is the only refresh mechanism.
 *
 * The photo, when there is one, is layered over the initials circle and
 * clipped to it, so a broken or slow image lets the circle show through with
 * no error handler; SVG image error events are not reliable across browsers.
 */
// @FollowsBlueprint organism-presentational
export function ElevationProfile({ edition, ranked, now }: ElevationProfileProps) {
  const { t } = useTranslation();
  const hasSamples = hasElevationSamples(edition);
  const geometry = buildProfileGeometry(
    edition.gpx.trackJson.pointElevations ?? EMPTY_ELEVATIONS,
    indexTrack(edition.gpx.trackJson.points).cumulative,
    VIEWBOX_WIDTH,
    VIEWBOX_HEIGHT,
  );
  const pastilles = listElevationPastilles(edition, ranked, now.getTime(), geometry, VIEWBOX_WIDTH);

  return (
    <div className="card-body flush elevation-profile" style={FRAME_STYLE}>
      <Show when={!hasSamples}>
        <div className="muted" style={PLACEHOLDER_STYLE}>
          {t('elevation.unavailable')}
        </div>
      </Show>
      <Show when={hasSamples}>
        <svg
          role="img"
          aria-label={t('elevation.aria-label')}
          viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
          preserveAspectRatio="xMidYMid meet"
          width="100%"
          height="100%"
        >
          <defs>
            <linearGradient id={GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent, #f43f5e)" stopOpacity="0.6" />
              <stop offset="100%" stopColor="var(--accent, #f43f5e)" stopOpacity="0" />
            </linearGradient>
            <filter id={PASTILLE_SHADOW_ID} x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="1" stdDeviation="1.2" floodOpacity="0.35" />
            </filter>
          </defs>
          <polygon points={geometry.areaPolygonPoints} fill={`url(#${GRADIENT_ID})`} />
          <polyline
            points={geometry.linePolylinePoints}
            fill="none"
            stroke="var(--accent, #f43f5e)"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {pastilles.map((pastille) => (
            <g
              key={pastille.runnerKey}
              className="runner-pastille"
              transform={`translate(${pastille.centerX} ${pastille.centerY})`}
              filter={`url(#${PASTILLE_SHADOW_ID})`}
            >
              <circle
                cx={0}
                cy={0}
                r={AVATAR_RADIUS_PX}
                fill={pastille.backgroundColor}
                stroke="var(--bg)"
                strokeWidth="2"
                data-runner-slug={pastille.runnerSlug}
              />
              <text
                x={0}
                y={0}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={AVATAR_FONT_PX}
                fontWeight="700"
                fill="var(--accent-ink, #111)"
              >
                {pastille.initials}
              </text>
              <Show when={pastille.photoUrl !== null}>
                <defs>
                  <clipPath id={`profile-avatar-clip-${pastille.runnerKey}`}>
                    <circle cx={0} cy={0} r={AVATAR_RADIUS_PX} />
                  </clipPath>
                </defs>
                <image
                  href={pastille.photoUrl ?? ''}
                  x={-AVATAR_RADIUS_PX}
                  y={-AVATAR_RADIUS_PX}
                  width={AVATAR_RADIUS_PX * 2}
                  height={AVATAR_RADIUS_PX * 2}
                  clipPath={`url(#profile-avatar-clip-${pastille.runnerKey})`}
                  preserveAspectRatio="xMidYMid slice"
                  data-runner-slug={pastille.runnerSlug}
                  data-surface="profile"
                />
              </Show>
            </g>
          ))}
        </svg>
      </Show>
    </div>
  );
}
