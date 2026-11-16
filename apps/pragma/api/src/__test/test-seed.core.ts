import type { Lineup } from '@domain/lineup.core';

export type SeedLineupByMemberName = Readonly<Record<string, readonly string[]>>;

// @FollowsBlueprint core-projection
export function buildSeedLineup(
  lineupByMemberName: SeedLineupByMemberName,
  memberIdByName: ReadonlyMap<string, string>,
  instrumentIdByName: ReadonlyMap<string, string>,
): Lineup {
  const lineup: Record<string, readonly string[]> = {};
  for (const [memberName, instrumentNames] of Object.entries(lineupByMemberName)) {
    const memberId = memberIdByName.get(memberName);
    if (memberId === undefined) continue;
    lineup[memberId] = selectInstrumentIds(instrumentNames, instrumentIdByName);
  }
  return lineup;
}

// @FollowsBlueprint core-projection
export function selectInstrumentIds(
  instrumentNames: readonly string[],
  instrumentIdByName: ReadonlyMap<string, string>,
): string[] {
  return instrumentNames.flatMap((name) => {
    const instrumentId = instrumentIdByName.get(name);
    return instrumentId === undefined ? [] : [instrumentId];
  });
}

export interface SeedChartSource {
  readonly title: string;
  readonly chordChartText: string;
}

export interface SeedChart {
  readonly kind: 'chordpro';
  readonly text: string;
  readonly instrumentIds: string[];
  readonly label: string | null;
}

interface SeedChartAssignment {
  readonly instrumentNames: readonly string[];
  readonly label: string | null;
  readonly text: string;
}

const AFTERGLOW_GUITAR_TAB = `{title: Afterglow}
{key: G}
{start_of_tab}
e|---------------7-----|
B|-------8---8---------|
G|---7-----------------|
{end_of_tab}`;

const SEED_INSTRUMENT_CHARTS: Readonly<Record<string, readonly SeedChartAssignment[]>> = {
  Afterglow: [{ instrumentNames: ['Guitare'], label: null, text: AFTERGLOW_GUITAR_TAB }],
};

// @FollowsBlueprint core-projection
export function buildSeedCharts(
  song: SeedChartSource,
  instrumentIdByName: ReadonlyMap<string, string>,
): SeedChart[] {
  const instrumentCharts = (SEED_INSTRUMENT_CHARTS[song.title] ?? []).map((chart) => ({
    kind: 'chordpro' as const,
    text: chart.text,
    instrumentIds: selectInstrumentIds(chart.instrumentNames, instrumentIdByName),
    label: chart.label,
  }));
  return [
    { kind: 'chordpro', text: song.chordChartText, instrumentIds: [], label: null },
    ...instrumentCharts,
  ];
}

export type AdminCredentialsState = 'created' | 'already-set';

export function selectAdminCredentialsState(
  bootstrapKind: 'ok' | 'already-bootstrapped',
): AdminCredentialsState {
  return bootstrapKind === 'ok' ? 'created' : 'already-set';
}
