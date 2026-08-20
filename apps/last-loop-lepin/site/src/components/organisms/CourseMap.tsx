import L from 'leaflet';
import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { formatElevationMetres, formatKilometres } from '../../lib/formatters.utils';
import { listPresent } from '../../lib/optional.utils';
import type { RaceEditionDto, RankedRunnerDto } from '../../lib/race.types';
import { recordDiagnosticEvent } from '../../observability/sentry';
import { Show } from '../atoms/Show';
import { listRunnerMarkers, selectProjectionMode } from './course-map-markers.core';

interface CourseMapProps {
  readonly edition: RaceEditionDto;
  readonly ranked: readonly RankedRunnerDto[];
  /** Wall clock used to place each runner along the track. */
  readonly now: Date;
}

const MIN_MAP_HEIGHT_PX = 320;
const MAP_FOOTER_HEIGHT_PX = 40;
const TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · &copy; <a href="https://carto.com/attributions">CARTO</a>';
const TILE_SUBDOMAINS = 'abcd';
const MAXIMUM_ZOOM = 20;
const TRACK_COLOR = 'var(--color-accent)';
const TRACK_WEIGHT = 4;
const TRACK_OPACITY = 0.9;
const FIT_BOUNDS_PADDING_PX = 24;
const START_ICON_SIZE_PX = 16;
const START_ICON_ANCHOR_PX = 8;
const RUNNER_ICON_SIZE_PX = 28;
const RUNNER_ICON_ANCHOR_PX = 14;
const FIT_BOUNDS_PADDING: L.PointTuple = [FIT_BOUNDS_PADDING_PX, FIT_BOUNDS_PADDING_PX];
const START_ICON_SIZE: L.PointTuple = [START_ICON_SIZE_PX, START_ICON_SIZE_PX];
const START_ICON_ANCHOR: L.PointTuple = [START_ICON_ANCHOR_PX, START_ICON_ANCHOR_PX];
const RUNNER_ICON_SIZE: L.PointTuple = [RUNNER_ICON_SIZE_PX, RUNNER_ICON_SIZE_PX];
const RUNNER_ICON_ANCHOR: L.PointTuple = [RUNNER_ICON_ANCHOR_PX, RUNNER_ICON_ANCHOR_PX];
const START_DOT_CLASS =
  'block w-3.5 h-3.5 rounded-full bg-ink border-2 border-bg shadow-[0_0_0_1px_var(--color-ink)]';

const FOOTER_STYLE = {
  padding: '12px 20px',
  fontSize: 12,
  borderTop: '1px solid var(--color-line-soft)',
} as const;

const MAP_FRAME_STYLE = {
  display: 'flex',
  flexDirection: 'column',
  minHeight: MIN_MAP_HEIGHT_PX,
} as const;

const MAP_CANVAS_STYLE = {
  flex: 1,
  minHeight: MIN_MAP_HEIGHT_PX - MAP_FOOTER_HEIGHT_PX,
  width: '100%',
} as const;

export function CourseMap({ edition, ranked, now }: CourseMapProps) {
  const { t } = useTranslation();
  const runnerLayerRef = useRef<L.LayerGroup | null>(null);
  const points = edition.gpx.trackJson.points;
  const startLat = edition.gpx.startLatLng.lat;
  const startLng = edition.gpx.startLatLng.lng;
  const startMarkerTitle = t('course-map.start-marker');

  /**
   * Leaflet owns the map instance: it attaches to a DOM node, keeps its own
   * pan and zoom state, and has to be torn down explicitly. A ref callback
   * with a cleanup is the way in that does not need an effect.
   */
  /**
   * @Blueprint organism-imperative-bridge
   * @BlueprintName Organism Bridging An Imperative Library
   * @BlueprintUsage Use for a third party library that owns a DOM node and needs to be created and torn down with it.
   * @BlueprintDescription Builds the Leaflet map inside a ref callback that returns its own cleanup, which React calls when the node goes away, so the map's lifecycle follows the element rather than a mount effect. The callback is wrapped in `useCallback` over the values the map is built from, so a re-render with the same track does not tear the map down and rebuild it.
   */
  const attachMap = useCallback(
    (container: HTMLDivElement) => {
      const latLngs: L.LatLngTuple[] = points.map((point) => [point.lat, point.lng]);
      const map = L.map(container, { attributionControl: true, zoomControl: true });
      L.tileLayer(TILE_URL, {
        subdomains: TILE_SUBDOMAINS,
        maxZoom: MAXIMUM_ZOOM,
        attribution: TILE_ATTRIBUTION,
      }).addTo(map);
      L.polyline(latLngs, {
        color: TRACK_COLOR,
        weight: TRACK_WEIGHT,
        opacity: TRACK_OPACITY,
      }).addTo(map);
      L.marker([startLat, startLng], {
        icon: L.divIcon({
          className: 'bg-transparent border-0',
          html: `<span class="${START_DOT_CLASS}"></span>`,
          iconSize: START_ICON_SIZE,
          iconAnchor: START_ICON_ANCHOR,
        }),
        title: startMarkerTitle,
      }).addTo(map);
      runnerLayerRef.current = L.layerGroup().addTo(map);
      map.fitBounds(latLngs, { padding: FIT_BOUNDS_PADDING });
      return () => {
        map.remove();
        runnerLayerRef.current = null;
      };
    },
    [points, startLat, startLng, startMarkerTitle],
  );

  // @FollowsBlueprint lint-exception
  // eslint-disable-next-line borso/no-use-effect -- Leaflet owns the map instance lifecycle, so each standings tick has to be pushed into its layer group by hand.
  useEffect(() => {
    for (const layer of listPresent(runnerLayerRef.current)) {
      layer.clearLayers();
      recordDiagnosticEvent('course_map', 'runner_positions_projected', {
        mode: selectProjectionMode(edition.gpx.trackJson.pointTimeFractions),
      });
      for (const marker of listRunnerMarkers(edition, ranked, now.getTime())) {
        L.marker([marker.position.lat, marker.position.lng], {
          icon: L.divIcon({
            className: 'bg-transparent border-0',
            html: marker.avatarHtml,
            iconSize: RUNNER_ICON_SIZE,
            iconAnchor: RUNNER_ICON_ANCHOR,
          }),
          title: t(marker.titleKey, { ...marker.titleParameters }),
        }).addTo(layer);
      }
    }
  }, [edition, ranked, now, t]);

  const distance = t('common.distance', {
    kilometres: formatKilometres(edition.gpx.distanceMeters),
  });
  const elevation = t('common.elevation-gain', {
    metres: formatElevationMetres(edition.gpx.elevationGainMeters),
  });

  return (
    <>
      <Show when={points.length === 0}>
        <div className="flex-1 overflow-auto px-5 py-4 text-ink-3">
          {t('course-map.track-pending')}
        </div>
      </Show>
      <Show when={points.length > 0}>
        <div className="flex-1 overflow-auto p-0" style={MAP_FRAME_STYLE}>
          <div
            ref={attachMap}
            className="course-map"
            role="img"
            aria-label={t('course-map.aria-label', { distance })}
            style={MAP_CANVAS_STYLE}
          />
          <div className="font-mono tabular-nums text-ink-3" style={FOOTER_STYLE}>
            {t('course-map.summary', { distance, elevation })}
          </div>
        </div>
      </Show>
    </>
  );
}
