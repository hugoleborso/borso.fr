/** @Feature auth */

export interface HistoryEntriesHost {
  readonly navigation?: {
    readonly currentEntry: { readonly index: number } | null;
    entries(): readonly { readonly url: string | null }[];
  };
}

/** @DependsOnExternal browser-location */
export function readPageOrigin(): string {
  return window.location.origin;
}

export function leavePageFor(address: string): void {
  window.location.assign(address);
}

// @FollowsBlueprint injected-browser-api
export function readPreviousEntryUrl(host: HistoryEntriesHost = window): string | null {
  const navigation = host.navigation;
  const currentIndex = navigation?.currentEntry?.index ?? 0;
  return navigation?.entries()[currentIndex - 1]?.url ?? null;
}
