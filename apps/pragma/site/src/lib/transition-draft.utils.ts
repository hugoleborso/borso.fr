export type TransitionDrafts = ReadonlyMap<string, string>;

const KEY_SEPARATOR = '>';

// @FollowsBlueprint utils-pure-module
export function buildTransitionDraftKey(songAId: string, songBId: string): string {
  return `${songAId}${KEY_SEPARATOR}${songBId}`;
}

export function putTransitionDraft(
  drafts: TransitionDrafts,
  key: string,
  text: string,
): TransitionDrafts {
  const next = new Map(drafts);
  next.set(key, text);
  return next;
}

export function takeTransitionDraft(drafts: TransitionDrafts, key: string): string | null {
  return drafts.get(key) ?? null;
}

export function clearTransitionDraft(drafts: TransitionDrafts, key: string): TransitionDrafts {
  if (!drafts.has(key)) return drafts;
  const next = new Map(drafts);
  next.delete(key);
  return next;
}
