// @FollowsBlueprint core-decision
export function selectShownSection<Section extends string>(
  sections: readonly [Section, ...Section[]],
  chosen: Section,
): Section {
  return sections.includes(chosen) ? chosen : sections[0];
}
