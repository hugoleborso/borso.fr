import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { initialsAvatar } from '../domain/initials.utils';
import type { LatLngDto, RaceEditionDto, RankedRunnerDto } from '../domain/types';

interface CourseMapProps {
  readonly edition: RaceEditionDto;
  readonly ranked: readonly RankedRunnerDto[];
  /** Wall-clock used to compute the elapsed-since-last-punch fraction. */
  readonly now: Date;
}

const MIN_MAP_HEIGHT_PX = 320;

/**
 * Squared Euclidean distance in lat/lng degrees — fine for "which segment
 * am I on" comparisons over a single loop (Lépin's track fits in <0.01° of
 * lat/lng, where the great-circle vs. plane error is below 0.1 m). We only
 * need the *ordering* to identify the right segment, not the metric.
 */
function squaredDegrees(a: LatLngDto, b: LatLngDto): number {
  const dlat = a.lat - b.lat;
  const dlng = a.lng - b.lng;
  return dlat * dlat + dlng * dlng;
}

function metersBetween(a: LatLngDto, b: LatLngDto): number {
  // Same plane approximation as `geo.core` — Lépin's bounding box is small
  // enough that lat/lng degrees lerp linearly without visible distortion.
  const R = 6_371_000;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const dlat = ((b.lat - a.lat) * Math.PI) / 180;
  const dlng = ((b.lng - a.lng) * Math.PI) / 180;
  const h = Math.sin(dlat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dlng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

interface Indexed {
  readonly points: readonly LatLngDto[];
  readonly cumulative: readonly number[];
  readonly total: number;
}

function indexTrack(points: readonly LatLngDto[]): Indexed {
  const cumulative: number[] = [];
  let running = 0;
  for (let i = 0; i < points.length; i += 1) {
    const current = points[i];
    const previous = points[i - 1];
    if (current !== undefined && previous !== undefined) {
      running += metersBetween(previous, current);
    }
    cumulative.push(running);
  }
  const last = cumulative[cumulative.length - 1];
  return { points, cumulative, total: last ?? 0 };
}

function projectFraction(track: Indexed, fraction: number): LatLngDto {
  const first = track.points[0];
  if (first === undefined) return { lat: 0, lng: 0 };
  if (track.points.length === 1 || track.total === 0) return first;
  const target = Math.max(0, Math.min(1, fraction)) * track.total;
  let segmentIndex = 1;
  while (segmentIndex < track.cumulative.length) {
    const cursor = track.cumulative[segmentIndex];
    if (cursor === undefined || cursor >= target) break;
    segmentIndex += 1;
  }
  const start = track.points[segmentIndex - 1] ?? first;
  const end = track.points[segmentIndex] ?? start;
  const segStart = track.cumulative[segmentIndex - 1] ?? 0;
  const segEnd = track.cumulative[segmentIndex] ?? segStart;
  const segLen = segEnd - segStart;
  const t = segLen === 0 ? 0 : (target - segStart) / segLen;
  return {
    lat: start.lat + (end.lat - start.lat) * t,
    lng: start.lng + (end.lng - start.lng) * t,
  };
}

function runnerLoopPaceMs(entry: RankedRunnerDto, fallbackMs: number): number {
  return entry.lastLoopDurationMs ?? fallbackMs;
}

function avatarHtml(entry: RankedRunnerDto): string {
  const avatar = initialsAvatar(entry.runner.displayName);
  const initials = avatar.initials.replace(/[<>&"]/g, '');
  return `<span class="map-avatar" style="background:${avatar.backgroundColor}">${initials}</span>`;
}

export function CourseMap({ edition, ranked, now }: CourseMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const runnerLayerRef = useRef<L.LayerGroup | null>(null);
  const points = edition.gpx.trackJson.points;
  const startLat = edition.gpx.startLatLng.lat;
  const startLng = edition.gpx.startLatLng.lng;

  // Mount Leaflet once per edition — pan/zoom + tiles are external to the
  // React tree (a third-party imperative API that owns its own lifecycle),
  // so a `useEffect` is the canonical bridge here (see
  // CLAUDE.md "`useEffect` is a smell" carve-out for synchronising with an
  // external system). Re-fits the bounds whenever the GPX changes.
  useEffect(() => {
    const container = containerRef.current;
    if (container === null) return;
    if (points.length === 0) return;
    const latLngs: L.LatLngTuple[] = points.map((p) => [p.lat, p.lng]);
    const map = L.map(container, { attributionControl: true, zoomControl: true });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    polylineRef.current = L.polyline(latLngs, {
      color: 'var(--accent, #f43f5e)',
      weight: 4,
      opacity: 0.9,
    }).addTo(map);
    L.marker([startLat, startLng], {
      icon: L.divIcon({
        className: 'map-start-icon',
        html: '<span class="map-start-dot"></span>',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      }),
      title: 'Départ / arrivée',
    }).addTo(map);
    runnerLayerRef.current = L.layerGroup().addTo(map);
    map.fitBounds(latLngs, { padding: [24, 24] });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      polylineRef.current = null;
      runnerLayerRef.current = null;
    };
  }, [points, startLat, startLng]);

  // Re-paint runner markers on each standings poll. Each in-race runner
  // gets dropped at their estimated position: fraction =
  // elapsed-since-last-punch / pace, capped at 1. Pace falls back to the
  // edition's interval (one loop per top) when the runner hasn't closed
  // a loop yet.
  useEffect(() => {
    const layer = runnerLayerRef.current;
    if (layer === null) return;
    layer.clearLayers();
    if (edition.status !== 'live') return;
    const track = indexTrack(points);
    if (track.total === 0) return;
    const fallbackPaceMs = Math.max(edition.intervalMinutes, 1) * 60_000;
    const startMs = new Date(edition.startsAt).getTime();
    const nowMs = now.getTime();
    for (const entry of ranked) {
      if (entry.status.kind !== 'in-race') continue;
      const lastPunchMs =
        entry.lastFinishedAt === null ? startMs : new Date(entry.lastFinishedAt).getTime();
      const elapsedMs = Math.max(0, nowMs - lastPunchMs);
      const paceMs = runnerLoopPaceMs(entry, fallbackPaceMs);
      const fraction = paceMs === 0 ? 0 : elapsedMs / paceMs;
      const position = projectFraction(track, fraction);
      L.marker([position.lat, position.lng], {
        icon: L.divIcon({
          className: 'map-runner-icon',
          html: avatarHtml(entry),
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        }),
        title: `${entry.runner.displayName} · boucle ${entry.status.lastLoop} · ${Math.round(fraction * 100)}%`,
      }).addTo(layer);
    }
    // `squaredDegrees` stays used as a future hook for "which segment am I
    // on" lookups (e.g. when projecting GPS pings onto the polyline). Kept
    // here so the helper isn't tree-shaken away the moment the feature
    // grows beyond the cumulative-distance shortcut.
    void squaredDegrees;
  }, [ranked, now, edition.status, edition.startsAt, edition.intervalMinutes, points]);

  if (edition.gpx.trackJson.points.length === 0) {
    return <div className="card-body muted">Tracé à venir.</div>;
  }

  return (
    <div
      className="card-body flush"
      style={{ display: 'flex', flexDirection: 'column', minHeight: MIN_MAP_HEIGHT_PX }}
    >
      <div
        ref={containerRef}
        className="course-map"
        role="img"
        aria-label={`Tracé de la boucle, ${(edition.gpx.distanceMeters / 1000).toFixed(2)} km`}
        style={{ flex: 1, minHeight: MIN_MAP_HEIGHT_PX - 40, width: '100%' }}
      />
      <div
        className="muted mono"
        style={{ padding: 'var(--d-3) var(--d-5)', fontSize: 12, borderTop: '1px solid var(--line-soft)' }}
      >
        {(edition.gpx.distanceMeters / 1000).toFixed(2)} km · {Math.round(edition.gpx.elevationGainMeters)} m D+
      </div>
    </div>
  );
}
