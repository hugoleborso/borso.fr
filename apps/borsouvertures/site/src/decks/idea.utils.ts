import { readLanguageFamily } from '@/i18n/i18n.utils';
import type { Idea } from './deck.utils';

const FRENCH = 'fr';

// @FollowsBlueprint utils-pure-module
export function selectIdeaText(idea: Idea, languageTag: string): string {
  return readLanguageFamily(languageTag) === FRENCH ? idea.fr : idea.en;
}

export function listIdeaSourceUrls(ideas: readonly (Idea | null)[]): string[] {
  const sourceUrls = ideas.flatMap((idea) =>
    idea?.sourceUrl === undefined ? [] : [idea.sourceUrl],
  );
  return [...new Set(sourceUrls)];
}

export function selectDeckName(catalogueValue: unknown, nameKey: string): string {
  return typeof catalogueValue === 'string' ? catalogueValue : nameKey;
}
