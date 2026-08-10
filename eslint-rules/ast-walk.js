/**
 * A depth first walk over an AST subtree.
 *
 * ESLint's visitor keys reach every node in the file, and two rules need to
 * ask a narrower question, which is "does anything inside this one callback do
 * X". Collecting the answer with a file level visitor would mean tracking
 * which function the current node belongs to, and a walk of the subtree says
 * the same thing in four lines.
 *
 * The `parent` back reference is skipped, because following it turns the tree
 * into a cycle.
 */

const PARENT_KEY = 'parent';

function isAstNode(value) {
  return typeof value === 'object' && value !== null && typeof value.type === 'string';
}

/** Calls `visit` on every descendant of `node`, and not on `node` itself. */
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
