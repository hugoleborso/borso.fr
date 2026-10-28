import type { ToolAnswer, ToolOutcome, ToolRefusal, ToolResult } from './mcp.types';
import { readToolRefusal } from './tool-refusal.core';

const INTERNAL_ERROR: ToolRefusal = { error: 'internal-error' };
const UNKNOWN_FAILURE_CODE = 'unknown';

function isBlankValue(value: unknown): boolean {
  return value === null || value === '';
}

function dropBlankFields(this: unknown, key: string, value: unknown): unknown {
  const isObjectField = key !== '' && !Array.isArray(this);
  if (isObjectField && isBlankValue(value)) return undefined;
  return value;
}

export function serializeCompactly(body: unknown): string {
  return JSON.stringify(body, dropBlankFields);
}

function answerText(body: unknown): ToolResult['content'] {
  return [{ type: 'text', text: serializeCompactly(body) }];
}

// @FollowsBlueprint core-decision
export function shapeToolResult(answer: ToolAnswer): ToolResult {
  if (answer.kind === 'refused') return { isError: true, content: answerText(answer.body) };
  return { content: answerText(answer.body) };
}

export function shapeToolFailure(): ToolResult {
  return { isError: true, content: answerText(INTERNAL_ERROR) };
}

export function selectToolOutcome(answer: ToolAnswer): ToolOutcome {
  return answer.kind === 'refused' ? 'refused' : 'ok';
}

export function selectFailureCode(error: unknown): string {
  return error instanceof Error ? error.name : UNKNOWN_FAILURE_CODE;
}

export function selectThrownRefusal(error: unknown): ToolAnswer | null {
  const body = readToolRefusal(error);
  if (body === null) return null;
  return { kind: 'refused', body };
}
