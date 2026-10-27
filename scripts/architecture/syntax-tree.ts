import { parseSync, visitorKeys, type Node, type Program } from 'oxc-parser';

export type SyntaxNode = Node;

export interface ParsedSource {
  readonly program: Program;
  readonly text: string;
  readonly parentOf: ReadonlyMap<SyntaxNode, SyntaxNode>;
  readonly lineStarts: readonly number[];
}

const LINE_BREAK = '\n';

function isSyntaxNode(value: unknown): value is SyntaxNode {
  return typeof value === 'object' && value !== null && 'type' in value && 'start' in value;
}

export function listChildren(node: SyntaxNode): SyntaxNode[] {
  const children: SyntaxNode[] = [];
  for (const key of visitorKeys[node.type] ?? []) {
    const value: unknown = Reflect.get(node, key);
    if (Array.isArray(value)) {
      for (const entry of value) if (isSyntaxNode(entry)) children.push(entry);
    } else if (isSyntaxNode(value)) {
      children.push(value);
    }
  }
  return children;
}

export function forEachChild(node: SyntaxNode, visit: (child: SyntaxNode) => void): void {
  for (const child of listChildren(node)) visit(child);
}

function mapParents(program: Program): Map<SyntaxNode, SyntaxNode> {
  const parentOf = new Map<SyntaxNode, SyntaxNode>();
  const pending: SyntaxNode[] = [program];
  for (let node = pending.pop(); node !== undefined; node = pending.pop()) {
    for (const child of listChildren(node)) {
      parentOf.set(child, node);
      pending.push(child);
    }
  }
  return parentOf;
}

function listLineStarts(text: string): number[] {
  const starts = [0];
  for (
    let index = text.indexOf(LINE_BREAK);
    index !== -1;
    index = text.indexOf(LINE_BREAK, index + 1)
  ) {
    starts.push(index + 1);
  }
  return starts;
}

export function parseSource(fileName: string, text: string): ParsedSource {
  const { program } = parseSync(fileName, text, {
    lang: fileName.endsWith('.tsx') ? 'tsx' : 'ts',
    sourceType: 'module',
  });
  return { program, text, parentOf: mapParents(program), lineStarts: listLineStarts(text) };
}

export function readLineNumber(source: ParsedSource, offset: number): number {
  let low = 0;
  let high = source.lineStarts.length - 1;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if ((source.lineStarts[middle] ?? 0) <= offset) low = middle;
    else high = middle - 1;
  }
  return low + 1;
}

export function readNodeText(source: ParsedSource, node: SyntaxNode): string {
  return source.text.slice(node.start, node.end);
}
