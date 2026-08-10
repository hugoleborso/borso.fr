const NO_MOVES: readonly string[] = [];

/**
 * The book moves the board draws as arrows. Hiding them is the default: the
 * point of a drill is to recall the move rather than read it off the board.
 */
export function selectVisibleBookMoves(
  nextBookMovesUci: readonly string[],
  areArrowsVisible: boolean,
): readonly string[] {
  return areArrowsVisible ? nextBookMovesUci : NO_MOVES;
}
