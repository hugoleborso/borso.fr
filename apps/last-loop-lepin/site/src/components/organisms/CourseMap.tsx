import * as Sentry from '@sentry/react';
import L from 'leaflet';
import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { formatElevationMetres, formatKilometres } from '../../lib/formatters.utils';
import { listPresent } from '../../lib/optional.utils';
import type { RaceEditionDto, RankedRunnerDto } from '../../lib/race.types';
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
const TRACK_COLOR = 'var(--accent, #f43f5e)';
const TRACK_WEIGHT = 4;
const TRACK_OPACITY = 0.9;
const FIT_BOUNDS_PADDING: L.PointTuple = [24, 24];
const START_ICON_SIZE: L.PointTuple = [16, 16];
const START_ICON_ANCHOR: L.PointTuple = [8, 8];
const RUNNER_ICON_SIZE: L.PointTuple = [28, 28];
const RUNNER_ICON_ANCHOR: L.PointTuple = [14, 14];
const PROJECTION_BREADCRUMB_CATEGORY = 'course_map';
const PROJECTION_BREADCRUMB_MESSAGE = 'course_map_projection_mode';

const FOOTER_STYLE = {
  padding: 'var(--d-3) var(--d-5)',
  fontSize: 12,
  borderTop: '1px solid var(--line-soft)',
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
          className: 'map-start-icon',
          html: '<span class="map-start-dot"></span>',
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
      Sentry.addBreadcrumb({
        category: PROJECTION_BREADCRUMB_CATEGORY,
        message: PROJECTION_BREADCRUMB_MESSAGE,
        data: { mode: selectProjectionMode(edition.gpx.trackJson.pointTimeFractions) },
      });
      for (const marker of listRunnerMarkers(edition, ranked, now.getTime())) {
        L.marker([marker.position.lat, marker.position.lng], {
          icon: L.divIcon({
            className: 'map-runner-icon',
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
        <div className="card-body muted">{t('course-map.track-pending')}</div>
      </Show>
      <Show when={points.length > 0}>
        <div className="card-body flush" style={MAP_FRAME_STYLE}>
          <div
            ref={attachMap}
            className="course-map"
            role="img"
            aria-label={t('course-map.aria-label', { distance })}
            style={MAP_CANVAS_STYLE}
          />
          <div className="muted mono" style={FOOTER_STYLE}>
            {t('course-map.summary', { distance, elevation })}
          </div>
        </div>
      </Show>
    </>
  );
}
