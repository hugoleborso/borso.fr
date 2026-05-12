import type { RaceEditionDto } from '../domain/types';

interface CourseMapProps {
  readonly edition: RaceEditionDto;
}

interface BoundingBox {
  readonly minLat: number;
  readonly maxLat: number;
  readonly minLng: number;
  readonly maxLng: number;
}

function computeBounds(points: ReadonlyArray<{ readonly lat: number; readonly lng: number }>): BoundingBox {
  return points.reduce<BoundingBox>(
    (accumulator, point) => ({
      minLat: Math.min(accumulator.minLat, point.lat),
      maxLat: Math.max(accumulator.maxLat, point.lat),
      minLng: Math.min(accumulator.minLng, point.lng),
      maxLng: Math.max(accumulator.maxLng, point.lng),
    }),
    {
      minLat: Number.POSITIVE_INFINITY,
      maxLat: Number.NEGATIVE_INFINITY,
      minLng: Number.POSITIVE_INFINITY,
      maxLng: Number.NEGATIVE_INFINITY,
    },
  );
}

const SVG_WIDTH = 320;
const SVG_HEIGHT = 240;
const SVG_PADDING = 16;

export function CourseMap({ edition }: CourseMapProps) {
  const points = edition.gpx.trackJson.points;
  if (points.length === 0) {
    return <div className="card-body muted">Tracé à venir.</div>;
  }
  const bounds = computeBounds(points);
  const latRange = Math.max(bounds.maxLat - bounds.minLat, 1e-6);
  const lngRange = Math.max(bounds.maxLng - bounds.minLng, 1e-6);
  const drawableWidth = SVG_WIDTH - 2 * SVG_PADDING;
  const drawableHeight = SVG_HEIGHT - 2 * SVG_PADDING;

  const pathSegments = points.map((point, index) => {
    const x = SVG_PADDING + ((point.lng - bounds.minLng) / lngRange) * drawableWidth;
    const y = SVG_HEIGHT - SVG_PADDING - ((point.lat - bounds.minLat) / latRange) * drawableHeight;
    return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return (
    <div className="card-body">
      <svg
        width={SVG_WIDTH}
        height={SVG_HEIGHT}
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        role="img"
        aria-label={`Tracé de la boucle, ${(edition.gpx.distanceMeters / 1000).toFixed(2)} km`}
      >
        <path
          d={pathSegments.join(' ')}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="muted mono" style={{ marginTop: 'var(--d-2)' }}>
        {(edition.gpx.distanceMeters / 1000).toFixed(2)} km · {Math.round(edition.gpx.elevationGainMeters)} m D+
      </div>
    </div>
  );
}
