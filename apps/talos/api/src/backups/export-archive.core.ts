import { z } from 'zod';
import { parseJsonOrNull } from '../helpers/json/json.core';

export interface ExportSummary {
  readonly exportedAt: string;
  readonly tableCount: number;
}

const EXPORT_OBJECT_PREFIX = 'exports/';
const ISO_DATE_LENGTH = 'YYYY-MM-DD'.length;

const exportPayloadSchema = z.object({
  exportedAt: z.string().min(1),
  tables: z.record(z.string(), z.array(z.unknown())),
});

export function exportObjectKey(now: Date): string {
  return `${EXPORT_OBJECT_PREFIX}${now.toISOString().slice(0, ISO_DATE_LENGTH)}.json`;
}

export function buildExportRequestHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    'Accept-Encoding': 'gzip',
  };
}

// @FollowsBlueprint core-parse-untrusted
export function summariseExport(raw: string): ExportSummary | null {
  const parsedExport = exportPayloadSchema.safeParse(parseJsonOrNull(raw));
  if (!parsedExport.success) return null;
  return {
    exportedAt: parsedExport.data.exportedAt,
    tableCount: Object.keys(parsedExport.data.tables).length,
  };
}
