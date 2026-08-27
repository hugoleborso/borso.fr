import { useTranslation } from 'react-i18next';
import type { RaceEditionDto, RankedRunnerDto } from '../../lib/race.types';
import { Show } from '../atoms/Show';
import { indexTrack } from './course-map.utils';
import { hasElevationSamples, listElevationPastilles } from './elevation-pastilles.core';
import { buildProfileGeometry } from './elevation-profile.utils';

interface ElevationProfileProps {
  readonly edition: RaceEditionDto;
  readonly ranked: readonly RankedRunnerDto[];
  readonly now: Date;
}

const VIEWBOX_WIDTH_PER_HEIGHT = 4;
const VIEWBOX_HEIGHT = 200;
const VIEWBOX_WIDTH = VIEWBOX_HEIGHT * VIEWBOX_WIDTH_PER_HEIGHT;
const MIN_HEIGHT_PX = 200;
const AVATAR_RADIUS_PX = 10;
const RADII_PER_DIAMETER = 2;
const AVATAR_DIAMETER_PX = AVATAR_RADIUS_PX * RADII_PER_DIAMETER;
const AVATAR_FONT_PX = 11;
const GRADIENT_ID = 'elevation-fill';
const PASTILLE_SHADOW_ID = 'elevation-pastille-shadow';
const EMPTY_ELEVATIONS: readonly number[] = [];

const FRAME_STYLE = { minHeight: MIN_HEIGHT_PX } as const;
const PLACEHOLDER_STYLE = { height: MIN_HEIGHT_PX } as const;

// @FollowsBlueprint organism-presentational
export function ElevationProfile({ edition, ranked, now }: ElevationProfileProps) {
  const { t } = useTranslation();
  const hasSamples = hasElevationSamples(edition);
  const geometry = buildProfileGeometry({
    pointElevations: edition.gpx.trackJson.pointElevations ?? EMPTY_ELEVATIONS,
    cumulativeDistances: indexTrack(edition.gpx.trackJson.points).cumulative,
    width: VIEWBOX_WIDTH,
    height: VIEWBOX_HEIGHT,
  });
  const pastilles = listElevationPastilles({
    edition,
    ranked,
    nowMs: now.getTime(),
    geometry,
    viewBoxWidth: VIEWBOX_WIDTH,
  });

  return (
    <div className="flex flex-col flex-1 overflow-auto p-0 bg-bg-elev" style={FRAME_STYLE}>
      <Show when={!hasSamples}>
        <div className="flex items-center justify-center text-ink-3" style={PLACEHOLDER_STYLE}>
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
          className="block"
        >
          <defs>
            <linearGradient id={GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.6" />
              <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
            </linearGradient>
            <filter id={PASTILLE_SHADOW_ID} x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="1" stdDeviation="1.2" floodOpacity="0.35" />
            </filter>
          </defs>
          <polygon points={geometry.areaPolygonPoints} fill={`url(#${GRADIENT_ID})`} />
          <polyline
            points={geometry.linePolylinePoints}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {pastilles.map((pastille) => (
            <g
              key={pastille.runnerKey}
              className="transition-transform duration-[600ms] ease-out"
              transform={`translate(${pastille.centerX} ${pastille.centerY})`}
              filter={`url(#${PASTILLE_SHADOW_ID})`}
            >
              <circle
                cx={0}
                cy={0}
                r={AVATAR_RADIUS_PX}
                fill={pastille.backgroundColor}
                stroke="var(--color-bg)"
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
                fill="var(--color-accent-ink)"
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
                  width={AVATAR_DIAMETER_PX}
                  height={AVATAR_DIAMETER_PX}
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
