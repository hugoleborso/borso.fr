// @FollowsBlueprint utils-pure-module
export function buildTabId(idPrefix: string, tabId: string): string {
  return `${idPrefix}-tab-${tabId}`;
}

export function buildTabPanelId(idPrefix: string, tabId: string): string {
  return `${idPrefix}-panel-${tabId}`;
}

export function selectShownSection<Section extends string>(
  sections: readonly [Section, ...Section[]],
  chosen: Section,
): Section {
  return sections.includes(chosen) ? chosen : sections[0];
}
