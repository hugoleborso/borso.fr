import type { ToolAnswer, ToolOutcome, ToolRefusal, ToolResult } from './mcp.types';

const INTERNAL_ERROR: ToolRefusal = { error: 'internal-error' };
const UNKNOWN_FAILURE_CODE = 'unknown';

function answerText(body: unknown): ToolResult['content'] {
  return [{ type: 'text', text: JSON.stringify(body) }];
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
