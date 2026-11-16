// @FollowsBlueprint core-decision
export function normalizeChartLabel(label: string | null): string | null {
  const trimmed = label?.trim() ?? '';
  return trimmed.length === 0 ? null : trimmed;
}
