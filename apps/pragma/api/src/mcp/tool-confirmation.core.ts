export interface UpdateConfirmation {
  readonly id: string;
  readonly updated: readonly string[];
}

// @FollowsBlueprint core-projection
export function confirmUpdate(id: string, changes: object): UpdateConfirmation {
  const updated = Object.entries(changes)
    .filter(([, value]) => value !== undefined)
    .map(([field]) => field);
  return { id, updated };
}
