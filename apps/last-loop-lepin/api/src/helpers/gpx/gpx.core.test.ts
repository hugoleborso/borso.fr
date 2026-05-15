import { describe, expect, it } from 'vitest';
import {
  GpxParseError,
  buildPointTimeFractions,
  parseGpx,
  tryParseDate,
  tryParseFloat,
} from './gpx.core';

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

describe('tryParseDate', () => {
  it('returns null for undefined', () => {
    expect(tryParseDate(undefined)).toBeNull();
  });

  it('returns null for malformed datetime strings', () => {
    expect(tryParseDate('not-a-date')).toBeNull();
  });

  it('parses ISO-8601 UTC stamps to epoch milliseconds', () => {
    expect(tryParseDate('2026-05-14T10:13:33Z')).toBe(Date.parse('2026-05-14T10:13:33Z'));
  });
});

describe('buildPointTimeFractions', () => {
  it('returns null when fewer than two points are timestamped', () => {
    expect(buildPointTimeFractions([])).toBeNull();
    expect(buildPointTimeFractions([1000])).toBeNull();
  });

  it('returns null when any timestamp is null (timing-partial invalidates series)', () => {
    expect(buildPointTimeFractions([1000, null, 3000])).toBeNull();
  });

  it('returns null when the first timestamp is null', () => {
    expect(buildPointTimeFractions([null, 2000, 3000])).toBeNull();
  });

  it('returns null when the last timestamp is null', () => {
    expect(buildPointTimeFractions([1000, 2000, null])).toBeNull();
  });

  it('returns null when the elapsed span is zero (every point at same instant)', () => {
    expect(buildPointTimeFractions([5000, 5000, 5000])).toBeNull();
  });

  it('returns null when the span is negative (descending timestamps)', () => {
    expect(buildPointTimeFractions([5000, 4000, 3000])).toBeNull();
  });

  it('forces the last fraction to be exactly 1 (no floating-point drift)', () => {
    const fractions = buildPointTimeFractions([0, 1, 2, 3]) ?? [];
    expect(fractions[fractions.length - 1]).toBe(1);
    expect(fractions[0]).toBe(0);
  });

  it('captures non-uniform cadence (uphill slower than downhill)', () => {
    // First half spans 9s (slow uphill), second half 1s (fast downhill).
    const fractions = buildPointTimeFractions([0, 9000, 10000]) ?? [];
    expect(fractions).toEqual([0, 0.9, 1]);
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

// Strava-recorded sample sub-sampled from the 2026-05-14 test edition GPX
// (`/root/.claude/uploads/.../1dfdb349-Course_a__pied_le_midi.gpx`, 2644
// trkpts) down to 50 evenly-spaced trkpts (indices `floor(i * (N-1) /
// (sample-1))`). Inlined as a string constant matching the existing
// `MINIMAL_GPX` convention — no `__fixtures__` folder introduced.
const STRAVA_RECORDED_SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<gpx creator="StravaGPX" version="1.1">
 <trk>
  <name>Course a pied le midi (sub-sampled)</name>
  <trkseg>
   <trkpt lat="45.5372030" lon="5.8031880"><ele>382.0</ele><time>2026-05-14T10:13:33Z</time></trkpt>
   <trkpt lat="45.5385050" lon="5.8040060"><ele>379.0</ele><time>2026-05-14T10:14:26Z</time></trkpt>
   <trkpt lat="45.5380990" lon="5.8038080"><ele>379.0</ele><time>2026-05-14T10:15:39Z</time></trkpt>
   <trkpt lat="45.5377250" lon="5.8053820"><ele>385.0</ele><time>2026-05-14T10:16:33Z</time></trkpt>
   <trkpt lat="45.5368650" lon="5.8071680"><ele>385.0</ele><time>2026-05-14T10:17:27Z</time></trkpt>
   <trkpt lat="45.5360070" lon="5.8083640"><ele>388.0</ele><time>2026-05-14T10:18:21Z</time></trkpt>
   <trkpt lat="45.5351680" lon="5.8090030"><ele>395.0</ele><time>2026-05-14T10:19:15Z</time></trkpt>
   <trkpt lat="45.5341470" lon="5.8091770"><ele>397.0</ele><time>2026-05-14T10:20:09Z</time></trkpt>
   <trkpt lat="45.5334360" lon="5.8084190"><ele>407.0</ele><time>2026-05-14T10:21:03Z</time></trkpt>
   <trkpt lat="45.5328920" lon="5.8079330"><ele>421.0</ele><time>2026-05-14T10:21:57Z</time></trkpt>
   <trkpt lat="45.5322360" lon="5.8080580"><ele>435.0</ele><time>2026-05-14T10:22:51Z</time></trkpt>
   <trkpt lat="45.5314840" lon="5.8082960"><ele>447.0</ele><time>2026-05-14T10:23:45Z</time></trkpt>
   <trkpt lat="45.5309750" lon="5.8080530"><ele>460.0</ele><time>2026-05-14T10:24:39Z</time></trkpt>
   <trkpt lat="45.5303390" lon="5.8077720"><ele>474.0</ele><time>2026-05-14T10:25:33Z</time></trkpt>
   <trkpt lat="45.5297700" lon="5.8078740"><ele>486.0</ele><time>2026-05-14T10:26:27Z</time></trkpt>
   <trkpt lat="45.5289460" lon="5.8077690"><ele>497.0</ele><time>2026-05-14T10:27:21Z</time></trkpt>
   <trkpt lat="45.5282980" lon="5.8074090"><ele>509.0</ele><time>2026-05-14T10:28:15Z</time></trkpt>
   <trkpt lat="45.5276650" lon="5.8073740"><ele>520.0</ele><time>2026-05-14T10:29:08Z</time></trkpt>
   <trkpt lat="45.5271210" lon="5.8071830"><ele>532.0</ele><time>2026-05-14T10:30:02Z</time></trkpt>
   <trkpt lat="45.5264600" lon="5.8073900"><ele>545.0</ele><time>2026-05-14T10:30:56Z</time></trkpt>
   <trkpt lat="45.5257270" lon="5.8072050"><ele>556.0</ele><time>2026-05-14T10:31:50Z</time></trkpt>
   <trkpt lat="45.5247230" lon="5.8071430"><ele>566.0</ele><time>2026-05-14T10:32:44Z</time></trkpt>
   <trkpt lat="45.5241890" lon="5.8070370"><ele>578.0</ele><time>2026-05-14T10:33:38Z</time></trkpt>
   <trkpt lat="45.5235820" lon="5.8068260"><ele>591.0</ele><time>2026-05-14T10:34:32Z</time></trkpt>
   <trkpt lat="45.5229480" lon="5.8065920"><ele>601.0</ele><time>2026-05-14T10:35:26Z</time></trkpt>
   <trkpt lat="45.5219310" lon="5.8062650"><ele>614.0</ele><time>2026-05-14T10:36:20Z</time></trkpt>
   <trkpt lat="45.5212590" lon="5.8051400"><ele>620.0</ele><time>2026-05-14T10:37:14Z</time></trkpt>
   <trkpt lat="45.5206120" lon="5.8030870"><ele>604.0</ele><time>2026-05-14T10:38:08Z</time></trkpt>
   <trkpt lat="45.5208080" lon="5.8010450"><ele>594.0</ele><time>2026-05-14T10:39:02Z</time></trkpt>
   <trkpt lat="45.5212900" lon="5.7993030"><ele>583.0</ele><time>2026-05-14T10:39:56Z</time></trkpt>
   <trkpt lat="45.5207750" lon="5.7969670"><ele>563.0</ele><time>2026-05-14T10:40:50Z</time></trkpt>
   <trkpt lat="45.5203450" lon="5.7947770"><ele>549.0</ele><time>2026-05-14T10:41:44Z</time></trkpt>
   <trkpt lat="45.5218980" lon="5.7939110"><ele>532.0</ele><time>2026-05-14T10:42:38Z</time></trkpt>
   <trkpt lat="45.5213160" lon="5.7951100"><ele>528.0</ele><time>2026-05-14T10:43:31Z</time></trkpt>
   <trkpt lat="45.5221410" lon="5.7969190"><ele>525.0</ele><time>2026-05-14T10:44:25Z</time></trkpt>
   <trkpt lat="45.5233520" lon="5.7985360"><ele>514.0</ele><time>2026-05-14T10:45:19Z</time></trkpt>
   <trkpt lat="45.5238050" lon="5.7979980"><ele>497.0</ele><time>2026-05-14T10:46:13Z</time></trkpt>
   <trkpt lat="45.5245340" lon="5.7997550"><ele>484.0</ele><time>2026-05-14T10:47:07Z</time></trkpt>
   <trkpt lat="45.5259350" lon="5.7999760"><ele>469.0</ele><time>2026-05-14T10:48:01Z</time></trkpt>
   <trkpt lat="45.5270650" lon="5.8004470"><ele>457.0</ele><time>2026-05-14T10:48:55Z</time></trkpt>
   <trkpt lat="45.5268550" lon="5.7990340"><ele>445.0</ele><time>2026-05-14T10:49:49Z</time></trkpt>
   <trkpt lat="45.5283520" lon="5.7995370"><ele>432.0</ele><time>2026-05-14T10:50:43Z</time></trkpt>
   <trkpt lat="45.5295090" lon="5.8001270"><ele>423.0</ele><time>2026-05-14T10:51:37Z</time></trkpt>
   <trkpt lat="45.5309310" lon="5.8012260"><ele>413.0</ele><time>2026-05-14T10:52:31Z</time></trkpt>
   <trkpt lat="45.5315880" lon="5.8022530"><ele>411.0</ele><time>2026-05-14T10:53:25Z</time></trkpt>
   <trkpt lat="45.5320670" lon="5.8029340"><ele>421.0</ele><time>2026-05-14T10:54:19Z</time></trkpt>
   <trkpt lat="45.5330390" lon="5.8037910"><ele>431.0</ele><time>2026-05-14T10:55:13Z</time></trkpt>
   <trkpt lat="45.5342180" lon="5.8027880"><ele>422.0</ele><time>2026-05-14T10:56:07Z</time></trkpt>
   <trkpt lat="45.5359840" lon="5.8028950"><ele>400.0</ele><time>2026-05-14T10:57:01Z</time></trkpt>
   <trkpt lat="45.5370640" lon="5.8031330"><ele>391.0</ele><time>2026-05-14T10:57:55Z</time></trkpt>
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

  it('returns null pointTimeFractions when no <trkpt> has a <time>', () => {
    const track = parseGpx(MINIMAL_GPX);
    expect(track.pointTimeFractions).toBeNull();
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

  it('all-timed: builds monotonic pointTimeFractions from a Strava-style GPX', () => {
    const track = parseGpx(STRAVA_RECORDED_SAMPLE);
    const fractions = track.pointTimeFractions;
    expect(fractions).not.toBeNull();
    if (fractions === null) return;
    expect(fractions).toHaveLength(track.points.length);
    expect(fractions[0]).toBe(0);
    expect(fractions[fractions.length - 1]).toBe(1);
    for (let index = 1; index < fractions.length; index += 1) {
      const previous = fractions[index - 1];
      const current = fractions[index];
      if (previous === undefined || current === undefined) continue;
      expect(current).toBeGreaterThan(previous);
    }
  });

  it('non-uniform-timed: captures the slow-then-fast cadence asymmetry', () => {
    const nonUniform = `<gpx><trk><trkseg>
      <trkpt lat="0.0" lon="0.0"><time>2026-01-01T00:00:00Z</time></trkpt>
      <trkpt lat="0.0" lon="0.001"><time>2026-01-01T00:09:00Z</time></trkpt>
      <trkpt lat="0.0" lon="0.002"><time>2026-01-01T00:10:00Z</time></trkpt>
    </trkseg></trk></gpx>`;
    const track = parseGpx(nonUniform);
    expect(track.pointTimeFractions).toEqual([0, 0.9, 1]);
  });

  it('one-missing-time: returns null pointTimeFractions (timing-partial = fallback)', () => {
    const oneMissing = `<gpx><trk><trkseg>
      <trkpt lat="0.0" lon="0.0"><time>2026-01-01T00:00:00Z</time></trkpt>
      <trkpt lat="0.0" lon="0.001"></trkpt>
      <trkpt lat="0.0" lon="0.002"><time>2026-01-01T00:02:00Z</time></trkpt>
    </trkseg></trk></gpx>`;
    const track = parseGpx(oneMissing);
    expect(track.pointTimeFractions).toBeNull();
  });

  it('malformed-time: returns null pointTimeFractions when a <time> fails to parse', () => {
    const badTime = `<gpx><trk><trkseg>
      <trkpt lat="0.0" lon="0.0"><time>2026-01-01T00:00:00Z</time></trkpt>
      <trkpt lat="0.0" lon="0.001"><time>not-a-date</time></trkpt>
      <trkpt lat="0.0" lon="0.002"><time>2026-01-01T00:02:00Z</time></trkpt>
    </trkseg></trk></gpx>`;
    const track = parseGpx(badTime);
    expect(track.pointTimeFractions).toBeNull();
  });

  it('metadata-time-only: <metadata><time> does not contaminate per-trkpt timing', () => {
    const metadataTime = `<gpx><metadata><time>2026-01-01T00:00:00Z</time></metadata>
      <trk><trkseg>
        <trkpt lat="0.0" lon="0.0"></trkpt>
        <trkpt lat="0.0" lon="0.001"></trkpt>
      </trkseg></trk></gpx>`;
    const track = parseGpx(metadataTime);
    expect(track.pointTimeFractions).toBeNull();
  });

  it('single-point edge: returns null pointTimeFractions (no usable spread)', () => {
    const singlePoint = `<gpx><trk><trkseg>
      <trkpt lat="45.0" lon="5.0"><time>2026-01-01T00:00:00Z</time></trkpt>
    </trkseg></trk></gpx>`;
    const track = parseGpx(singlePoint);
    expect(track.points).toHaveLength(1);
    expect(track.pointTimeFractions).toBeNull();
  });
});
