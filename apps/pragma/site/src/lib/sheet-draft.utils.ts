export type SheetDrafts<TDraft> = ReadonlyMap<string, TDraft>;

// @FollowsBlueprint utils-pure-module
export function putDraft<TDraft>(
  drafts: SheetDrafts<TDraft>,
  key: string,
  draft: TDraft,
): SheetDrafts<TDraft> {
  const next = new Map(drafts);
  next.set(key, draft);
  return next;
}

export function takeDraft<TDraft>(drafts: SheetDrafts<TDraft>, key: string): TDraft | null {
  return drafts.get(key) ?? null;
}

export function clearDraft<TDraft>(drafts: SheetDrafts<TDraft>, key: string): SheetDrafts<TDraft> {
  if (!drafts.has(key)) return drafts;
  const next = new Map(drafts);
  next.delete(key);
  return next;
}
