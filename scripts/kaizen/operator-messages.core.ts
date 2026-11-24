import { z } from 'zod';

const ANSWER_PREFIXES = ['The user answered:', 'Your questions have been answered:'];
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
      .object({
        message: z.object({ content: z.unknown() }).loose(),
        isSynthetic: z.boolean().optional(),
        agent_id: z.string().optional(),
      })
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
  const text = result.data.content;
  return ANSWER_PREFIXES.some((prefix) => text.startsWith(prefix)) ? text : null;
}

function readTyped(content: unknown): string | null {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return null;
  const texts = content.flatMap((block) => {
    const text = textBlockSchema.safeParse(block);
    return text.success ? [text.data.text] : [];
  });
  return texts.length === content.length ? texts.join('\n') : null;
}

// @FollowsBlueprint utils-pure-module
export function selectOperatorMessages(page: unknown): OperatorMessage[] {
  const parsed = pageSchema.safeParse(page);
  if (!parsed.success) return [];
  return parsed.data.data.flatMap((raw): OperatorMessage[] => {
    const event = userEventSchema.safeParse(raw);
    const catchall = event.success ? event.data.user.internal_anthropic_catchall : undefined;
    if (!event.success || catchall?.isSynthetic === true || catchall?.agent_id !== undefined)
      return [];
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

const savedBlocksSchema = z.array(z.object({ text: z.string() }).loose());
const wrappedPageSchema = z.object({ ccr: z.unknown() });

export function readSavedPage(saved: string): unknown {
  const text = saved.startsWith('[')
    ? savedBlocksSchema
        .parse(JSON.parse(saved))
        .map((block) => block.text)
        .join('')
    : saved;
  const line = text.split('\n').find((candidate) => candidate.trimStart().startsWith('{'));
  // Stryker disable next-line StringLiteral: equivalent mutant, JSON.parse refuses any fallback string alike
  const parsed: unknown = JSON.parse(line ?? '');
  const wrapped = wrappedPageSchema.safeParse(parsed);
  return wrapped.success ? wrapped.data.ccr : parsed;
}

const transcriptLineSchema = z.object({ message: z.object({ content: z.array(z.unknown()) }) });
const toolUseSchema = z.object({ type: z.literal('tool_use'), id: z.string(), name: z.string() });
const toolResultBlockSchema = z.object({
  type: z.literal('tool_result'),
  tool_use_id: z.string(),
  content: z.unknown(),
});
const SPILLED_TO = /saved to (\/\S+\.txt)/u;

export type ListedPage = { readonly spilledTo: string } | { readonly saved: string };

export function listListedPages(transcriptLines: readonly string[]): ListedPage[] {
  const listEventsCalls = new Set<string>();
  return transcriptLines.flatMap((line) => {
    const parsed = transcriptLineSchema.safeParse(JSON.parse(line));
    if (!parsed.success) return [];
    return parsed.data.message.content.flatMap((block): ListedPage[] => {
      const call = toolUseSchema.safeParse(block);
      if (call.success && call.data.name.endsWith('list_events')) listEventsCalls.add(call.data.id);
      const result = toolResultBlockSchema.safeParse(block);
      if (!result.success || !listEventsCalls.has(result.data.tool_use_id)) return [];
      const { content } = result.data;
      if (typeof content !== 'string') return [{ saved: JSON.stringify(content) }];
      const spilledTo = SPILLED_TO.exec(content)?.[1];
      return spilledTo === undefined ? [] : [{ spilledTo }];
    });
  });
}

const LOGGED_LINES = /(?<=^\S*\[kaizen\]\S* )logged as \S+: .+/gmu;

export function listLoggedLines(value: unknown): string[] {
  if (typeof value === 'string') return value.match(LOGGED_LINES) ?? [];
  return value instanceof Object ? Object.values(value).flatMap(listLoggedLines) : [];
}
