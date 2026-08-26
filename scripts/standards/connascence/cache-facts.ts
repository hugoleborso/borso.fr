import ts from 'typescript';

export const CACHE_METHODS = new Set([
  'invalidateQueries',
  'refetchQueries',
  'removeQueries',
  'cancelQueries',
  'setQueryData',
  'setQueriesData',
]);
export const QUERY_HOOKS = new Set(['useQuery', 'useSuspenseQuery', 'useInfiniteQuery']);
const QUERY_KEY_PROPERTY = 'queryKey';
export const KEY_FACTORY_SUFFIX = 'Keys';

export function numericValueOf(node: ts.Node): number | null {
  if (!ts.isNumericLiteral(node)) return null;
  const parsed = Number(node.text);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function rootKeyOf(node: ts.Node): string | null {
  let found: string | null = null;
  const walk = (current: ts.Node): void => {
    if (found !== null) return;
    if (ts.isIdentifier(current) && current.text.endsWith(KEY_FACTORY_SUFFIX)) {
      found = current.text;
      return;
    }
    if (ts.isStringLiteral(current)) {
      found = current.text;
      return;
    }
    ts.forEachChild(current, walk);
  };
  walk(node);
  return found;
}

export function queryKeyArgumentOf(call: ts.CallExpression): ts.Node | null {
  const first = call.arguments[0];
  if (first === undefined) return null;
  if (!ts.isObjectLiteralExpression(first)) return first;
  for (const property of first.properties) {
    if (
      ts.isPropertyAssignment(property) &&
      ts.isIdentifier(property.name) &&
      property.name.text === QUERY_KEY_PROPERTY
    ) {
      return property.initializer;
    }
  }
  return null;
}

export function calleeNameOf(call: ts.CallExpression): string | null {
  if (ts.isIdentifier(call.expression)) return call.expression.text;
  if (ts.isPropertyAccessExpression(call.expression)) return call.expression.name.text;
  return null;
}
