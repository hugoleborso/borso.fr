export type PositionKey = string;

const POSITION_KEY_FIELD_COUNT = 4;
const FEN_FIELD_SEPARATOR = ' ';
const POSITION_KEY_PATTERN =
  /^[1-8BKNPQRbknpqr]+(?:\/[1-8BKNPQRbknpqr]+){7} [bw] (?:-|[KQkq]{1,4}) (?:-|[a-h][36])$/;

// @FollowsBlueprint domain-shared-selection
export function derivePositionKey(fen: string): PositionKey {
  return fen
    .split(FEN_FIELD_SEPARATOR)
    .slice(0, POSITION_KEY_FIELD_COUNT)
    .join(FEN_FIELD_SEPARATOR);
}

export function isPositionKey(value: string): boolean {
  return POSITION_KEY_PATTERN.test(value);
}
