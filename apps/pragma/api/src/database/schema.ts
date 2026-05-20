/**
 * Drizzle schema barrel. Each domain owns its table definitions in
 * `<domain>.schema.ts` (vertical-slice rule per CLAUDE.md). This file
 * re-exports them in one namespace so the drizzle client + drizzle-kit
 * can pick up every table without listing them ad-hoc.
 *
 * Foreign keys are declared in TypeScript for documentation but Aurora
 * DSQL does not enforce them at write time (see last-loop-lepin's
 * runner.schema.ts header). App-level invariants live in the service
 * layer.
 */

export { appConfigTable, authAttemptTable } from '../auth/auth.schema';
export { memberTable, memberInstrumentTable } from '../members/members.schema';
export { instrumentTable } from '../instruments/instruments.schema';
export { songTable } from '../songs/songs.schema';
export { masteryDefaultTable, masteryOverrideTable } from '../mastery/mastery.schema';
export { sessionTable } from '../sessions/sessions.schema';
export { setlistTable, setlistEntryTable } from '../setlists/setlists.schema';
export { transitionCommentTable } from '../transitions/transitions.schema';
export { barTable } from '../bars/bars.schema';
