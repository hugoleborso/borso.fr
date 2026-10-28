import { useSyncExternalStore } from 'react';
import { clearDraft, putDraft, type SheetDrafts, takeDraft } from './sheet-draft.utils';

type Listener = () => void;

export interface SheetDraft<TDraft> {
  readonly draft: TDraft | null;
  readonly keep: (draft: TDraft) => void;
  readonly revise: (change: (kept: TDraft | null) => TDraft) => void;
  readonly discard: () => void;
}

export type SheetDraftHook<TDraft> = (key: string) => SheetDraft<TDraft>;

// @FollowsBlueprint hook-external-store
export function createSheetDraftStore<TDraft>(): SheetDraftHook<TDraft> {
  const listeners = new Set<Listener>();
  const store: { drafts: SheetDrafts<TDraft> } = { drafts: new Map() };

  const publish = (next: SheetDrafts<TDraft>): void => {
    store.drafts = next;
    for (const listener of listeners) listener();
  };
  const subscribe = (listener: Listener): (() => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };
  const read = (): SheetDrafts<TDraft> => store.drafts;

  return function useSheetDraft(key: string): SheetDraft<TDraft> {
    const drafts = useSyncExternalStore(subscribe, read, read);
    return {
      draft: takeDraft(drafts, key),
      keep: (draft) => {
        publish(putDraft(store.drafts, key, draft));
      },
      revise: (change) => {
        publish(putDraft(store.drafts, key, change(takeDraft(store.drafts, key))));
      },
      discard: () => {
        publish(clearDraft(store.drafts, key));
      },
    };
  };
}
