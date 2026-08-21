const PARENT_KEY = 'parent';

function isAstNode(value) {
  return typeof value === 'object' && value !== null && typeof value.type === 'string';
}

// @FollowsBlueprint lint-rule-predicate
export function forEachDescendant(node, visit) {
  for (const key of Object.keys(node)) {
    if (key === PARENT_KEY) {
      continue;
    }
    const value = node[key];
    const children = Array.isArray(value) ? value : [value];
    for (const child of children) {
      if (isAstNode(child)) {
        visit(child);
        forEachDescendant(child, visit);
      }
    }
  }
}
