/**
 * One visitor for every way a module names another module.
 *
 * A rule about "which files may reach which other files" has three node types
 * to cover, not one: `import x from 's'`, `export { x } from 's'`, and
 * `export * from 's'`. The last two are an import and an export in one
 * statement, so a rule that visits only `ImportDeclaration` can be defeated by
 * re-exporting the forbidden module and importing it from the re-exporter,
 * which is a path the rule's own pattern no longer matches. That is not a
 * hypothetical: five services in `last-loop-lepin` carried
 * `export { getDatabase } from '../database/client'`, and it put the database
 * client in every controller of that application with the lint green at both
 * ends.
 *
 * The fix is to stop asking rule authors to remember three visitor keys. A
 * rule passes a function of the source string, and this module decides which
 * nodes carry one. An `export` with no source, e.g. `export const x = 1`, has
 * a null `source` and is skipped here rather than in each caller.
 *
 * See docs/dantotsus/a-lint-rule-that-knew-only-one-of-three-spellings.md.
 */

/**
 * @param {(source: string, node: import('estree').Node) => void} visitSource
 * @returns {import('eslint').Rule.RuleListener}
 */
export function onEveryModuleSource(visitSource) {
  function visit(node) {
    const source = node.source?.value;
    if (typeof source !== 'string') {
      return;
    }
    visitSource(source, node);
  }
  return {
    ImportDeclaration: visit,
    ExportNamedDeclaration: visit,
    ExportAllDeclaration: visit,
  };
}

/**
 * Whether the statement carries only types, which disappear at compile time
 * and so carry no value the rules above are trying to keep out.
 *
 * An import declaration marks this with `importKind`, a re-export with
 * `exportKind`, and either one's specifiers can be marked individually.
 */
export function isTypeOnlyModuleSource(node) {
  if (node.importKind === 'type' || node.exportKind === 'type') {
    return true;
  }
  const specifiers = node.specifiers ?? [];
  const valueSpecifiers = specifiers.filter(
    (specifier) => (specifier.importKind ?? specifier.exportKind ?? 'value') === 'value',
  );
  return specifiers.length > 0 && valueSpecifiers.length === 0;
}
