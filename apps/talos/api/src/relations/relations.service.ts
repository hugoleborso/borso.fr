import { readContentFile } from '../content/content.service';
import { formatParisDate } from '../helpers/calendar/paris-clock.utils';
import { parseRelations, type RelationsDigest } from './relations.core';

const RELATIONS_PATH = 'etat/relations.json';

// @FollowsBlueprint service-read-model
export async function readRelations(now: Date): Promise<RelationsDigest> {
  return parseRelations(await readContentFile(RELATIONS_PATH), formatParisDate(now));
}
