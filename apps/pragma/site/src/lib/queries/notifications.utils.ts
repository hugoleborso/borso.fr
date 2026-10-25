interface CategoryToggle<Category extends string> {
  readonly category: Category;
  readonly enabled: boolean;
}

// @FollowsBlueprint utils-pure-module
export function setCategoryToggle<Category extends string>(
  toggles: readonly CategoryToggle<Category>[],
  category: Category,
  isEnabled: boolean,
): CategoryToggle<Category>[] {
  return toggles.map((toggle) =>
    toggle.category === category ? { category, enabled: isEnabled } : toggle,
  );
}
