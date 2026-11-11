import { type ArchivedExport, archiveExport } from './backups/export-archive.adapter';
import { runInWideEvent } from './helpers/observability/wide-event.adapter';

// @FollowsBlueprint api-lambda-entrypoint
export const handler = async (): Promise<ArchivedExport> =>
  await runInWideEvent({ 'event.kind': 'scheduled', 'scheduled.job': 'export' }, () =>
    archiveExport(),
  );
