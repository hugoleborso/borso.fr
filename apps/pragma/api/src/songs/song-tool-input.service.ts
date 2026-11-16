import type { z } from 'zod';
import { listNameCandidates } from '../instruments/lineup-names.core';
import {
  type NamedLineupInput,
  readLineupNames,
  resolveNamedLineupOrRefuse,
} from '../instruments/instruments.service';
import { parseToolFields, pickReference } from '../mcp/mcp.service';
import {
  songChordChartsSchema,
  type songChartToolInputSchema,
  type songCreateInputSchema,
  type songUpdateInputSchema,
} from './songs.schema';

type SongChartToolInput = z.infer<typeof songChartToolInputSchema>;
type SongCharts = z.output<typeof songChordChartsSchema>;
type SongCreateInput = z.infer<typeof songCreateInputSchema>;
type SongUpdateInput = z.infer<typeof songUpdateInputSchema>;

// @FollowsBlueprint service-read-model
async function resolveChartInstrumentsOrRefuse(
  charts: readonly SongChartToolInput[],
): Promise<SongCharts> {
  const candidates = listNameCandidates((await readLineupNames()).instruments);
  const resolved = charts.map(({ instruments, label, ...content }) => ({
    ...content,
    instrumentIds: (instruments ?? []).map((reference) =>
      pickReference('instrument', candidates, reference),
    ),
    label: label ?? null,
  }));
  return parseToolFields(songChordChartsSchema, resolved);
}

export async function buildSongUpdate(
  changes: Omit<SongUpdateInput, 'defaultLineup' | 'charts'>,
  lineup: NamedLineupInput | undefined,
  charts: readonly SongChartToolInput[] | undefined,
): Promise<SongUpdateInput> {
  return {
    ...changes,
    ...(lineup === undefined ? {} : { defaultLineup: await resolveNamedLineupOrRefuse(lineup) }),
    ...(charts === undefined ? {} : { charts: await resolveChartInstrumentsOrRefuse(charts) }),
  };
}

export async function buildSongCreate(
  input: Omit<SongCreateInput, 'defaultLineup' | 'charts'>,
  lineup: NamedLineupInput | undefined,
  charts: readonly SongChartToolInput[] | undefined,
): Promise<SongCreateInput> {
  return {
    ...input,
    defaultLineup: lineup === undefined ? {} : await resolveNamedLineupOrRefuse(lineup),
    charts: charts === undefined ? [] : await resolveChartInstrumentsOrRefuse(charts),
  };
}
