// @FollowsBlueprint utils-pure-module
import { forEachChild, parse } from 'unbash';
import type { Command, HereDoc, SyntaxNode } from 'unbash';

export interface SimpleCommand {
  readonly name: string;
  readonly args: readonly string[];
}

interface TextEdit {
  readonly start: number;
  readonly end: number;
}

const LONE_URL = /^https?:\/\/[^\s'"]+$/u;

function visitAll(node: SyntaxNode, visit: (node: SyntaxNode) => void): void {
  visit(node);
  forEachChild(node, (child) => visitAll(child, visit));
}

function readArgumentValue(argument: Command['args'][number]): string {
  return argument.type === 'Word' ? argument.value : argument.text;
}

export function listSimpleCommands(command: string): SimpleCommand[] {
  const commands: SimpleCommand[] = [];
  visitAll(parse(command), (node) => {
    if (node.type !== 'Command' || node.name === undefined) return;
    commands.push({ name: node.name.value, args: node.args.map(readArgumentValue) });
  });
  return commands;
}

function selectHereDocEdit(hereDoc: HereDoc, command: string): TextEdit {
  const bodyEnd = hereDoc.closing?.end ?? hereDoc.body.end;
  const isFollowedByNewline = command[bodyEnd] === '\n';
  return {
    start: hereDoc.body.pos,
    end: isFollowedByNewline ? bodyEnd + 1 : bodyEnd,
  };
}

function selectQuotedEdit(start: number, end: number, command: string): TextEdit | null {
  const body = command.slice(start + 1, end - 1);
  if (LONE_URL.test(body)) return null;
  return { start: start + 1, end: end - 1 };
}

function collectEdits(command: string): TextEdit[] {
  const edits: TextEdit[] = [];
  visitAll(parse(command), (node) => {
    if (node.type === 'HereDoc') {
      edits.push({ start: node.pos, end: node.end });
      edits.push(selectHereDocEdit(node, command));
    }
    if (node.type === 'SingleQuoted' || node.type === 'DoubleQuoted') {
      const edit = selectQuotedEdit(node.pos, node.end, command);
      if (edit !== null) edits.push(edit);
    }
  });
  return edits;
}

function dropNestedEdits(edits: readonly TextEdit[]): TextEdit[] {
  const sorted = [...edits].sort((first, second) => first.start - second.start);
  const kept: TextEdit[] = [];
  for (const edit of sorted) {
    const previous = kept.at(-1);
    if (previous !== undefined && edit.start < previous.end) continue;
    kept.push(edit);
  }
  return kept;
}

export function stripStringBodies(command: string): string {
  const edits = dropNestedEdits(collectEdits(command));
  let result = '';
  let cursor = 0;
  for (const edit of edits) {
    result += command.slice(cursor, edit.start);
    cursor = edit.end;
  }
  return result + command.slice(cursor);
}
