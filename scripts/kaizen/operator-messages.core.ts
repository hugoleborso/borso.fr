import { z } from 'zod';

const ANSWER_PREFIX = 'The user answered:';
const HARNESS_MARKERS = [
  '<system-reminder>',
  '<task-notification>',
  '[SYSTEM NOTIFICATION',
  'Stop hook feedback:',
  'Another Claude session sent a message:',
  "This session's worker process was restarted",
  '<agent-message',
  '<artifact-view-context',
  '[Request interrupted',
];

const textBlockSchema = z.object({ type: z.literal('text'), text: z.string() });
const toolResultSchema = z.object({ type: z.literal('tool_result'), content: z.unknown() });
const userEventSchema = z.object({
  created_at: z.string(),
  user: z.object({
    internal_anthropic_catchall: z
      .object({ message: z.object({ content: z.unknown() }).loose() })
      .loose()
      .optional(),
    message: z.object({ content: z.unknown() }).loose().optional(),
  }),
});
const pageSchema = z.object({ data: z.array(z.unknown()) });

export interface OperatorMessage {
  readonly at: string;
  readonly text: string;
  readonly isAnswer: boolean;
}

const WRAPPER_BLOCKS =
  /<(system-reminder|artifact-view-context|task-notification)\b[^>]*>[\s\S]*?<\/\1>/gu;
const WRAPPER_LINES = /^(\(The JSON line above[^\n]*|<artifact-content-authored-by-others\/>)$/gmu;

export function stripHarnessWrappers(text: string): string {
  return text.replaceAll(WRAPPER_BLOCKS, '').replaceAll(WRAPPER_LINES, '').trim();
}

function isTypedByTheOperator(text: string): boolean {
  return text.length > 0 && !HARNESS_MARKERS.some((marker) => text.startsWith(marker));
}

function readAnswer(block: unknown): string | null {
  const result = toolResultSchema.safeParse(block);
  if (!result.success || typeof result.data.content !== 'string') return null;
  return result.data.content.startsWith(ANSWER_PREFIX) ? result.data.content : null;
}

function readTyped(content: unknown): string | null {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return null;
  const texts = content.flatMap((block) => {
    const text = textBlockSchema.safeParse(block);
    return text.success ? [text.data.text] : [];
  });
  return texts.length === content.length && texts.length > 0 ? texts.join('\n') : null;
}

// @FollowsBlueprint utils-pure-module
export function selectOperatorMessages(page: unknown): OperatorMessage[] {
  const parsed = pageSchema.safeParse(page);
  if (!parsed.success) return [];
  return parsed.data.data.flatMap((raw): OperatorMessage[] => {
    const event = userEventSchema.safeParse(raw);
    if (!event.success) return [];
    const message = event.data.user.message ?? event.data.user.internal_anthropic_catchall?.message;
    const content = message?.content;
    const typedRaw = readTyped(content);
    const typed = typedRaw === null ? null : stripHarnessWrappers(typedRaw);
    if (typed !== null) {
      return isTypedByTheOperator(typed)
        ? [{ at: event.data.created_at, text: typed, isAnswer: false }]
        : [];
    }
    const answers = Array.isArray(content)
      ? content.flatMap((block) => readAnswer(block) ?? [])
      : [];
    return answers.map((text) => ({ at: event.data.created_at, text, isAnswer: true }));
  });
}
