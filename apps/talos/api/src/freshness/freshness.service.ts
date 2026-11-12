import { readContentFile } from '../content/content.service';
import { type Freshness, parseFreshness } from './freshness.core';

const FRESHNESS_PATH = 'etat/fraicheur.json';

// @FollowsBlueprint service-read-model
export async function readFreshness(): Promise<Freshness> {
  return parseFreshness(await readContentFile(FRESHNESS_PATH));
}
