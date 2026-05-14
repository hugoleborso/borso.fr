import { describe, expect, it } from 'vitest';
import { GpxParseError, parseGpx, tryParseFloat } from './gpx.core';

describe('tryParseFloat', () => {
  it('returns null for undefined (the unreachable-from-regex branch covered directly)', () => {
    expect(tryParseFloat(undefined)).toBeNull();
  });

  it('returns null for non-numeric strings', () => {
    expect(tryParseFloat('abc')).toBeNull();
  });

  it('returns null for the empty string', () => {
    expect(tryParseFloat('')).toBeNull();
  });

  it('parses finite numerics', () => {
    expect(tryParseFloat('1.5')).toBe(1.5);
    expect(tryParseFloat('-2.0')).toBe(-2);
    expect(tryParseFloat('1e3')).toBe(1000);
  });

  it('returns null for Infinity-producing input', () => {
    expect(tryParseFloat('Infinity')).toBeNull();
  });
});

const MINIMAL_GPX = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="test">
  <trk>
    <name>Lépin loop</name>
    <trkseg>
      <trkpt lat="45.550" lon="5.780"><ele>400.0</ele></trkpt>
      <trkpt lat="45.555" lon="5.785"><ele>450.0</ele></trkpt>
      <trkpt lat="45.560" lon="5.790"><ele>500.0</ele></trkpt>
      <trkpt lat="45.565" lon="5.795"><ele>520.0</ele></trkpt>
    </trkseg>
  </trk>
</gpx>`;

describe('parseGpx', () => {
  it('extracts distance, elevation gain and start point from a minimal GPX', () => {
    const track = parseGpx(MINIMAL_GPX);
    expect(track.points).toHaveLength(4);
    expect(track.startLatLng).toEqual({ lat: 45.55, lng: 5.78 });
    expect(track.distanceMeters).toBeGreaterThan(0);
    expect(track.elevationGainMeters).toBe(120);
  });

  it('handles multiple track segments / tracks', () => {
    const multiTrack = `<?xml version="1.0"?><gpx>
      <trk><trkseg>
        <trkpt lat="0.0" lon="0.0"><ele>0</ele></trkpt>
        <trkpt lat="0.0" lon="0.001"><ele>10</ele></trkpt>
      </trkseg></trk>
      <trk><trkseg>
        <trkpt lat="0.0" lon="0.002"><ele>20</ele></trkpt>
      </trkseg></trk>
    </gpx>`;
    const track = parseGpx(multiTrack);
    expect(track.points).toHaveLength(3);
    expect(track.elevationGainMeters).toBe(20);
  });

  it('handles self-closing <trkpt/> entries', () => {
    const selfClosing = `<?xml version="1.0"?><gpx><trk><trkseg>
      <trkpt lat="48.0" lon="2.0"/>
      <trkpt lat="48.001" lon="2.001"/>
    </trkseg></trk></gpx>`;
    const track = parseGpx(selfClosing);
    expect(track.points).toHaveLength(2);
    expect(track.elevationGainMeters).toBe(0);
    expect(track.distanceMeters).toBeGreaterThan(0);
  });

  it('still parses tracks without elevation data', () => {
    const noElevation = `<?xml version="1.0"?><gpx><trk><trkseg>
      <trkpt lat="0.0" lon="0.0"></trkpt>
      <trkpt lat="0.0" lon="0.001"></trkpt>
    </trkseg></trk></gpx>`;
    const track = parseGpx(noElevation);
    expect(track.elevationGainMeters).toBe(0);
    expect(track.distanceMeters).toBeGreaterThan(0);
  });

  it('throws GpxParseError on empty input', () => {
    expect(() => parseGpx('')).toThrow(GpxParseError);
  });

  it('throws GpxParseError when no <gpx> or <trk> root is present', () => {
    expect(() => parseGpx('<html><body>nope</body></html>')).toThrow(GpxParseError);
  });

  it('throws GpxParseError when <gpx> contains no <trkpt>', () => {
    const empty = '<gpx><trk><trkseg></trkseg></trk></gpx>';
    expect(() => parseGpx(empty)).toThrow(GpxParseError);
  });

  it('ignores trkpt entries missing lat or lon attributes', () => {
    const missingAttrs = `<gpx><trk><trkseg>
      <trkpt foo="bar"/>
      <trkpt lat="45.0" lon="5.0"/>
    </trkseg></trk></gpx>`;
    const track = parseGpx(missingAttrs);
    expect(track.points).toHaveLength(1);
  });

  it('ignores trkpt entries with non-numeric coordinates', () => {
    const malformed = `<gpx><trk><trkseg>
      <trkpt lat="not-a-number" lon="5.0"><ele>100</ele></trkpt>
      <trkpt lat="45.0" lon="5.0"><ele>100</ele></trkpt>
      <trkpt lat="45.001" lon="5.001"><ele>110</ele></trkpt>
    </trkseg></trk></gpx>`;
    const track = parseGpx(malformed);
    expect(track.points).toHaveLength(2);
    expect(track.startLatLng).toEqual({ lat: 45.0, lng: 5.0 });
  });

  it('ignores trkpt elevation entries that are not numeric', () => {
    const badElevation = `<gpx><trk><trkseg>
      <trkpt lat="0.0" lon="0.0"><ele>NaNNaN</ele></trkpt>
      <trkpt lat="0.0" lon="0.001"><ele>100</ele></trkpt>
    </trkseg></trk></gpx>`;
    const track = parseGpx(badElevation);
    expect(track.points).toHaveLength(2);
    expect(track.elevationGainMeters).toBe(0);
  });

  it('ignores self-closing trkpt with bad coordinates', () => {
    const badSelfClosing = `<gpx><trk><trkseg>
      <trkpt lat="x" lon="y"/>
      <trkpt lat="45.0" lon="5.0"/>
    </trkseg></trk></gpx>`;
    const track = parseGpx(badSelfClosing);
    expect(track.points).toHaveLength(1);
  });
});
