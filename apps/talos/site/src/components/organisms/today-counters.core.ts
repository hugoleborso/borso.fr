export interface CountedShortcut {
  readonly count?: number;
}

// @FollowsBlueprint core-view-projection
export function keepNonZeroCounters<Shortcut extends CountedShortcut>(
  shortcuts: readonly Shortcut[],
): Shortcut[] {
  return shortcuts.filter((shortcut) => shortcut.count === undefined || shortcut.count > 0);
}
