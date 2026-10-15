export interface SettlementOptions {
  readonly onMutate?: unknown;
}

// @FollowsBlueprint utils-pure-module
export function isSettledByRefetch(options: SettlementOptions): boolean {
  return options.onMutate === undefined;
}
