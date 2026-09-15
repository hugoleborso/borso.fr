// @FollowsBlueprint database-schema-barrel
export { appConfigTable, authAttemptTable } from '../auth/auth.schema';
export {
  memberCredentialTable,
  memberPasskeyTable,
  webauthnChallengeTable,
} from '../auth/credentials.schema';
export { barTable } from '../bars/bars.schema';
export { instrumentTable } from '../instruments/instruments.schema';
export { masteryDefaultTable, masteryOverrideTable } from '../mastery/mastery.schema';
export { memberInstrumentTable, memberTable } from '../members/members.schema';
export { outreachTemplateTable } from '../outreach/outreach.schema';
export { sessionTable } from '../sessions/sessions.schema';
export {
  sessionSetlistTable,
  setlistEntryTable,
  setlistTable,
  setlistVoteTable,
} from '../setlists/setlists.schema';
export { songTable } from '../songs/songs.schema';
export { transitionCommentTable } from '../transitions/transitions.schema';
