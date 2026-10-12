import { z } from 'zod';
import { parseJsonOrNull } from '../helpers/json/json.core';

export interface RunReport {
  readonly at: string;
  readonly trigger?: string;
  readonly failedSources: string[];
}

export interface LastRuns {
  readonly scan: RunReport | null;
  readonly macCollection: RunReport | null;
}

const runReportSchema = z.object({
  date: z.string().min(1),
  par: z.string().optional(),
  sources_ko: z.array(z.string()).optional(),
});

const lastRunsFileSchema = z.object({ scan: z.unknown(), collecte_mac: z.unknown() }).partial();

function readRunReport(entry: unknown): RunReport | null {
  const report = runReportSchema.safeParse(entry);
  if (!report.success) return null;
  const { date, par, sources_ko: failedSources = [] } = report.data;
  return { at: date, ...(par === undefined ? {} : { trigger: par }), failedSources };
}

// @FollowsBlueprint core-parse-untrusted
export function parseLastRuns(raw: string): LastRuns | null {
  const lastRunsFile = lastRunsFileSchema.safeParse(parseJsonOrNull(raw));
  if (!lastRunsFile.success) return null;
  return {
    scan: readRunReport(lastRunsFile.data.scan),
    macCollection: readRunReport(lastRunsFile.data.collecte_mac),
  };
}
