import { readSecureParameter } from '../helpers/secrets/parameter-store.client';
import { putJsonObject } from '../helpers/storage/object-store.client';
import {
  buildExportRequestHeaders,
  type ExportSummary,
  exportObjectKey,
  summariseExport,
} from './export-archive.core';

export type ExportFetcher = (url: string, init: RequestInit) => Promise<Response>;

export interface ArchiveExportDependencies {
  readonly fetcher?: ExportFetcher;
  readonly readParameter?: (name: string) => Promise<string | undefined>;
  readonly storeObject?: (bucket: string, key: string, body: string) => Promise<void>;
  readonly environment?: Readonly<Record<string, string | undefined>>;
  readonly now?: Date;
}

export interface ArchivedExport extends ExportSummary {
  readonly objectKey: string;
}

export class ExportArchiveError extends Error {
  override readonly name = 'ExportArchiveError';
}

const CONFIGURATION_VARIABLES = ['EXPORT_BUCKET', 'EXPORT_URL', 'AGENT_TOKEN_PARAMETER'] as const;
type ConfigurationVariable = (typeof CONFIGURATION_VARIABLES)[number];

function readConfiguration(
  environment: Readonly<Record<string, string | undefined>>,
): Record<ConfigurationVariable, string> {
  const configuration = Object.fromEntries(
    CONFIGURATION_VARIABLES.map((name) => [name, environment[name] ?? '']),
  );
  const missing = CONFIGURATION_VARIABLES.filter((name) => configuration[name] === '');
  if (missing.length > 0) throw new ExportArchiveError(`missing ${missing.join(', ')}`);
  return {
    EXPORT_BUCKET: String(configuration.EXPORT_BUCKET),
    EXPORT_URL: String(configuration.EXPORT_URL),
    AGENT_TOKEN_PARAMETER: String(configuration.AGENT_TOKEN_PARAMETER),
  };
}

// @FollowsBlueprint adapter-external-service
export async function archiveExport(
  dependencies: ArchiveExportDependencies = {},
): Promise<ArchivedExport> {
  const configuration = readConfiguration(dependencies.environment ?? process.env);
  const readParameter = dependencies.readParameter ?? readSecureParameter;
  const token = await readParameter(configuration.AGENT_TOKEN_PARAMETER);
  if (token === undefined) {
    throw new ExportArchiveError(`${configuration.AGENT_TOKEN_PARAMETER} could not be read`);
  }
  const fetcher = dependencies.fetcher ?? fetch;
  const response = await fetcher(configuration.EXPORT_URL, {
    method: 'GET',
    headers: buildExportRequestHeaders(token),
  });
  if (!response.ok) throw new ExportArchiveError(`the export answered ${response.status}`);
  const body = await response.text();
  const summary = summariseExport(body);
  if (summary === null)
    throw new ExportArchiveError('the export body is not { exportedAt, tables }');
  const objectKey = exportObjectKey(dependencies.now ?? new Date());
  const storeObject = dependencies.storeObject ?? putJsonObject;
  await storeObject(configuration.EXPORT_BUCKET, objectKey, body);
  return { objectKey, ...summary };
}
