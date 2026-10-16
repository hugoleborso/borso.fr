import { type RestoreDrillStep, runRestoreDrill } from './backups/restore-drill.adapter';

// @FollowsBlueprint api-lambda-entrypoint
export const handler = async (): Promise<RestoreDrillStep> => await runRestoreDrill();
