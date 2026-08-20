const NO_MOVES: readonly string[] = [];

// @FollowsBlueprint utils-branchless-list
export function selectVisibleBookMoves(
  nextBookMovesUci: readonly string[],
  areArrowsVisible: boolean,
): readonly string[] {
  return areArrowsVisible ? nextBookMovesUci : NO_MOVES;
}
