// @FollowsBlueprint utils-pure-module
export type HookEvent =
  | 'PreToolUse'
  | 'PostToolUse'
  | 'PostToolUseFailure'
  | 'Stop'
  | 'SessionStart';

export interface HookInput {
  readonly hook_event_name: HookEvent;
  readonly tool_name?: string;
  readonly tool_input?: Readonly<Record<string, unknown>>;
  readonly tool_response?: unknown;
  readonly transcript_path?: string;
  readonly cwd?: string;
  readonly agent_id?: string;
  readonly session_id?: string;
  readonly source?: string;
  readonly error?: string;
}

export interface CommandResult {
  readonly status: number;
  readonly stdout: string;
  readonly stderr: string;
}

export interface HookWorld {
  readonly projectDirectory: string;
  readEnvironment(name: string): string | undefined;
  readText(path: string): string | null;
  run(command: string, args: readonly string[], input?: string): CommandResult;
}

export type Verdict =
  | { readonly kind: 'pass' }
  | {
      readonly kind: 'refuse';
      readonly rule: string;
      readonly lines: readonly string[];
      readonly summary: string;
    }
  | { readonly kind: 'context'; readonly text: string }
  | {
      readonly kind: 'rewrite';
      readonly updatedInput: Readonly<Record<string, unknown>>;
      readonly text: string;
    }
  | { readonly kind: 'block'; readonly reason: string };

export interface Check {
  readonly name: string;
  readonly tools: RegExp | null;
  run(input: HookInput, world: HookWorld): Verdict;
}

export interface HookOutcome {
  readonly exitCode: 0 | 2;
  readonly stdout: string;
  readonly stderr: string;
  readonly refusals: readonly { readonly rule: string; readonly summary: string }[];
}

export const PASS: Verdict = { kind: 'pass' };

const NOTHING_RAN =
  '[hook] Nothing in this call ran. In a chained command, rerun the other steps on their own.';

export function refuse(rule: string, summary: string, lines: readonly string[]): Verdict {
  return { kind: 'refuse', rule, summary, lines: lines.map((line) => `[${rule}] ${line}`) };
}

export function selectChecksFor(checks: readonly Check[], toolName: string | undefined): Check[] {
  return checks.filter((check) => check.tools === null || check.tools.test(toolName ?? ''));
}

function renderRefusals(event: HookEvent, verdicts: readonly Verdict[]): HookOutcome | null {
  const refusals = verdicts.filter((verdict) => verdict.kind === 'refuse');
  if (refusals.length === 0) return null;
  const lines = refusals.flatMap((refusal) => refusal.lines);
  const closing = event === 'PreToolUse' ? [NOTHING_RAN] : [];
  return {
    exitCode: 2,
    stdout: '',
    stderr: [...lines, ...closing].join('\n') + '\n',
    refusals: refusals.map(({ rule, summary }) => ({ rule, summary })),
  };
}

function renderBlocks(verdicts: readonly Verdict[]): HookOutcome | null {
  const blocks = verdicts.filter((verdict) => verdict.kind === 'block');
  if (blocks.length === 0) return null;
  const reason = blocks.map((block) => block.reason).join('\n\n');
  return {
    exitCode: 0,
    stdout: JSON.stringify({ decision: 'block', reason }),
    stderr: '',
    refusals: [],
  };
}

function renderContexts(event: HookEvent, verdicts: readonly Verdict[]): HookOutcome {
  const notes = verdicts.filter(
    (verdict) => verdict.kind === 'context' || verdict.kind === 'rewrite',
  );
  if (notes.length === 0) return { exitCode: 0, stdout: '', stderr: '', refusals: [] };
  const rewrite = verdicts.find((verdict) => verdict.kind === 'rewrite');
  const additionalContext = notes.map((note) => note.text).join('\n\n');
  const updatedInput = rewrite === undefined ? {} : { updatedInput: rewrite.updatedInput };
  return {
    exitCode: 0,
    stdout: JSON.stringify({
      hookSpecificOutput: { hookEventName: event, ...updatedInput, additionalContext },
    }),
    stderr: '',
    refusals: [],
  };
}

export function renderOutcome(event: HookEvent, verdicts: readonly Verdict[]): HookOutcome {
  return (
    renderRefusals(event, verdicts) ?? renderBlocks(verdicts) ?? renderContexts(event, verdicts)
  );
}

const REFUSED_CALL_MAX_LENGTH = 200;

// @FollowsBlueprint core-projection
export function describeRefusedCall(input: HookInput): string {
  const toolName = input.tool_name ?? input.hook_event_name;
  const toolInput = input.tool_input ?? {};
  const target = toolInput['command'] ?? toolInput['file_path'] ?? toolInput['url'];
  if (typeof target !== 'string') return toolName;
  return `${toolName} ${target.replace(/\s+/gu, ' ').slice(0, REFUSED_CALL_MAX_LENGTH)}`;
}
