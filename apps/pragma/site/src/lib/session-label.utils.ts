export interface SessionLabelParts {
  readonly kindLabel: string;
  readonly dateLabel: string;
  readonly venue: string | null;
}

const LABEL_SEPARATOR = ' · ';

function isShown(part: string | null): part is string {
  return part !== null && part.trim().length > 0;
}

// @FollowsBlueprint utils-formatter
export function composeSessionLabel(parts: SessionLabelParts): string {
  return [parts.kindLabel, parts.dateLabel, parts.venue].filter(isShown).join(LABEL_SEPARATOR);
}
