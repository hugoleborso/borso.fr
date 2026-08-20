import { barTable } from '../bars/bars.schema';
import { getDatabase } from '../database/client';
import { instrumentTable } from '../instruments/instruments.schema';
import { masteryDefaultTable, masteryOverrideTable } from '../mastery/mastery.schema';
import { memberInstrumentTable, memberTable } from '../members/members.schema';
import { sessionTable } from '../sessions/sessions.schema';
import { sessionSetlistTable, setlistEntryTable, setlistTable } from '../setlists/setlists.schema';
import { songTable } from '../songs/songs.schema';
import { transitionCommentTable } from '../transitions/transitions.schema';

// @FollowsBlueprint repository-query
export async function deleteAllDomainRows(): Promise<void> {
  const database = getDatabase();
  await database.delete(setlistEntryTable);
  await database.delete(sessionSetlistTable);
  await database.delete(setlistTable);
  await database.delete(sessionTable);
  await database.delete(memberInstrumentTable);
  await database.delete(masteryOverrideTable);
  await database.delete(masteryDefaultTable);
  await database.delete(transitionCommentTable);
  await database.delete(barTable);
  await database.delete(songTable);
  await database.delete(memberTable);
  await database.delete(instrumentTable);
}
