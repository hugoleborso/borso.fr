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
