import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { initialsAvatar } from '../domain/initials.utils';
import type { RaceEditionDto, RankedRunnerDto } from '../domain/types';
import {
  indexTrack,
  projectFraction,
  projectFractionTimeAware,
  runnerDistanceFraction,
  squaredDegrees,
} from './course-map.utils';

interface CourseMapProps {
  readonly edition: RaceEditionDto;
  readonly ranked: readonly RankedRunnerDto[];
  /** Wall-clock used to compute the elapsed-since-last-punch fraction. */
  readonly now: Date;
}

const MIN_MAP_HEIGHT_PX = 320;
const PROJECTION_MODE_RECORDED = 'recorded-pace';
const PROJECTION_MODE_LINEAR = 'linear-fallback';
const MINUTES_TO_MS = 60_000;

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
  const pointTimeFractions = edition.gpx.trackJson.pointTimeFractions;
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
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 20,
      // CARTO Dark Matter — free for non-commercial use, OSM-derived.
      // Quieter palette than osm.org so the accent polyline + runner
      // chips own the visual weight.
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · &copy; <a href="https://carto.com/attributions">CARTO</a>',
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

  // Re-paint runner markers on each standings poll. Backyard rule: every
  // loop starts on the top-of-hour boundary, NOT when the previous loop
  // closes. A runner who clears loop N early waits at the corral until
  // T0 + N·loopMs, then everyone re-departs together. The projection
  // therefore reads `elapsed-since-loop-boundary` (not since last punch)
  // and parks the avatar at the start point when the runner has already
  // closed the current loop (= "at corral, done for this hour").
  useEffect(() => {
    const layer = runnerLayerRef.current;
    if (layer === null) return;
    layer.clearLayers();
    if (edition.status !== 'live') return;
    const track = indexTrack(points);
    if (track.total === 0) return;
    const loopMs = Math.max(edition.intervalMinutes, 1) * MINUTES_TO_MS;
    const startMs = new Date(edition.startsAt).getTime();
    const nowMs = now.getTime();
    const elapsedSinceRace = Math.max(0, nowMs - startMs);
    const currentLoopIndex = Math.floor(elapsedSinceRace / loopMs) + 1;
    // Single log per effect run (= per poll tick), not per-runner — keeps
    // the cardinality bounded. The tag is the same string Sentry will use
    // once the React breadcrumb wiring lands (see plan §E follow-up).
    const projectionMode =
      pointTimeFractions === undefined ? PROJECTION_MODE_LINEAR : PROJECTION_MODE_RECORDED;
    console.warn('course_map_projection_mode', { mode: projectionMode });
    const timingInputs = {
      status: edition.status,
      startsAt: edition.startsAt,
      intervalMinutes: edition.intervalMinutes,
    };
    for (const entry of ranked) {
      const computed = runnerDistanceFraction(timingInputs, entry, nowMs);
      if (computed === null) continue;
      const { fraction, restingAtCorral } = computed;
      const position =
        pointTimeFractions === undefined
          ? projectFraction(track, fraction)
          : projectFractionTimeAware(track, fraction, pointTimeFractions);
      L.marker([position.lat, position.lng], {
        icon: L.divIcon({
          className: 'map-runner-icon',
          html: avatarHtml(entry),
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        }),
        // `runnerDistanceFraction` returns null for everything except in-race
        // runners (cf. course-map.utils.ts), so at this point `entry.status` is
        // necessarily `{ kind: 'in-race', lastLoop }`. The redundant guard
        // narrows the discriminated union for TypeScript.
        title:
          restingAtCorral && entry.status.kind === 'in-race'
            ? `${entry.runner.displayName} · au corral · ${entry.status.lastLoop} boucles validées`
            : `${entry.runner.displayName} · boucle ${currentLoopIndex} · ${Math.round(fraction * 100)}%`,
      }).addTo(layer);
    }
    // `squaredDegrees` stays used as a future hook for "which segment am I
    // on" lookups (e.g. when projecting GPS pings onto the polyline). Kept
    // here so the helper isn't tree-shaken away the moment the feature
    // grows beyond the cumulative-distance shortcut.
    void squaredDegrees;
    // `pointTimeFractions` is listed alongside `points` only to silence the
    // `useExhaustiveDependencies` lint — both references are co-allocated by
    // `apiClient.getCurrentEdition` on every poll tick, so the effect would
    // re-run on `points` alone. See plan §F.
  }, [
    ranked,
    now,
    edition.status,
    edition.startsAt,
    edition.intervalMinutes,
    points,
    pointTimeFractions,
  ]);

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
