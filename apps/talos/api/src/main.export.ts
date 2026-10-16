import { type ArchivedExport, archiveExport } from './backups/export-archive.adapter';

// @FollowsBlueprint api-lambda-entrypoint
export const handler = async (): Promise<ArchivedExport> => await archiveExport();
