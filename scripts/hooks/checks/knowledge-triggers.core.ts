// @FollowsBlueprint utils-pure-module
import { type Check, type HookInput, type HookWorld, PASS, type Verdict } from '../check.core.ts';
import { stripStringBodies } from '../shell-command.core.ts';

type TriggerKind = 'paths' | 'commands' | 'output';

interface KnowledgeEntry {
  readonly path: string;
  readonly summary: string;
  readonly paths: readonly string[];
  readonly commands: readonly string[];
  readonly output: readonly string[];
}

interface Moment {
  readonly kind: TriggerKind;
  readonly subject: string;
}

const KNOWLEDGE_DIRECTORY = 'docs/knowledge';
const LOOKUP = '.claude/knowledge-triggers.json';
const MAXIMUM_ENTRIES = 3;
const OUTPUT_HEAD = 20000;
const OUTPUT_TAIL = 20000;
const WRITE_TOOLS = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit']);
const PATH_TOKEN_SEPARATORS = /[ \t;|&<>()=\n]+/u;
const CASE_INSENSITIVE_PREFIX = '(?i)';
const MOMENTS: Readonly<Record<TriggerKind, string>> = {
  paths: 'The file this call writes',
  commands: 'The command about to run',
  output: 'What that call printed',
};

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isAbsent(value: unknown): boolean {
  return value === undefined || value === null || value === false;
}

function jqToString(value: unknown): string {
  if (typeof value === 'string') return value;
  return JSON.stringify(value) ?? 'null';
}

function firstPresent(...values: readonly unknown[]): string {
  const present = values.find((value) => !isAbsent(value));
  return present === undefined ? '' : jqToString(present);
}

function dropTrailingNewlines(text: string): string {
  return text.replace(/\n+$/u, '');
}

const PATTERN_TOKEN = /\\[\s\S]|\[(?:\\[\s\S]|[^\]\\])*\]|[.$]/gu;
const JQ_TOKEN_MEANINGS: Readonly<Record<string, string>> = { '.': '[^\\n]', $: '(?=\\n?$)' };

export function toJavaScriptPattern(onigurumaPattern: string): RegExp {
  const isCaseInsensitive = onigurumaPattern.startsWith(CASE_INSENSITIVE_PREFIX);
  const pattern = isCaseInsensitive
    ? onigurumaPattern.slice(CASE_INSENSITIVE_PREFIX.length)
    : onigurumaPattern;
  const source = pattern.replace(PATTERN_TOKEN, (token) => JQ_TOKEN_MEANINGS[token] ?? token);
  return new RegExp(source, isCaseInsensitive ? 'i' : '');
}

function readStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];
}

function readEntry(value: unknown): KnowledgeEntry[] {
  if (!isRecord(value)) return [];
  const { path, summary } = value;
  if (typeof path !== 'string' || typeof summary !== 'string') return [];
  return [
    {
      path,
      summary,
      paths: readStrings(value['paths']),
      commands: readStrings(value['commands']),
      output: readStrings(value['output']),
    },
  ];
}

export function parseLookup(text: string): KnowledgeEntry[] {
  try {
    const lookup: unknown = JSON.parse(text);
    return isRecord(lookup) && Array.isArray(lookup['entries'])
      ? lookup['entries'].flatMap(readEntry)
      : [];
  } catch {
    return [];
  }
}

function findLookupStaleness(world: HookWorld): boolean | null {
  const newer = world.run('find', [
    KNOWLEDGE_DIRECTORY,
    '(',
    '-path',
    KNOWLEDGE_DIRECTORY,
    '-o',
    '-name',
    '*.md',
    ')',
    '-newer',
    LOOKUP,
    '-print',
    '-quit',
  ]);
  if (newer.status !== 0) return null;
  return newer.stdout !== '';
}

function readFreshLookup(world: HookWorld): string | null {
  const current = world.readText(LOOKUP);
  const isStale =
    current === null
      ? world.run('test', ['-d', KNOWLEDGE_DIRECTORY]).status === 0 || null
      : findLookupStaleness(world);
  if (isStale === null) return null;
  if (!isStale) return current;
  const compiled = world.run('python3', ['scripts/knowledge-triggers.py', 'compile']);
  return compiled.status === 0 ? world.readText(LOOKUP) : null;
}

function truncateOutput(output: string): string {
  const characters = Array.from(output);
  if (characters.length <= OUTPUT_HEAD + OUTPUT_TAIL) return output;
  return `${characters.slice(0, OUTPUT_HEAD).join('')}\n${characters.slice(-OUTPUT_TAIL).join('')}`;
}

function readStreams(response: Readonly<Record<string, unknown>>): string | null {
  const stdout = isAbsent(response['stdout']) ? '' : response['stdout'];
  const stderr = isAbsent(response['stderr']) ? '' : response['stderr'];
  if (typeof stdout !== 'string' || typeof stderr !== 'string') return null;
  return `${stdout}\n${stderr}`;
}

function readResponseText(response: unknown): string | null {
  if (typeof response === 'string') return response;
  if (isRecord(response) && ('stdout' in response || 'stderr' in response)) {
    return readStreams(response);
  }
  return jqToString(response);
}

function readOutput(input: HookInput): string {
  if (!isAbsent(input.error)) return truncateOutput(jqToString(input.error));
  const response = readResponseText(input.tool_response);
  return response === null ? '' : truncateOutput(response);
}

function isOutputTool(input: HookInput, tool: string): boolean {
  if (input.hook_event_name === 'PostToolUse') return tool === 'Bash' || tool.startsWith('mcp__');
  return input.hook_event_name === 'PostToolUseFailure' && tool === 'Bash';
}

function selectMoment(input: HookInput): Moment | null {
  const tool = input.tool_name ?? '';
  const toolInput = input.tool_input ?? {};
  if (input.hook_event_name === 'PreToolUse' && WRITE_TOOLS.has(tool)) {
    return {
      kind: 'paths',
      subject: firstPresent(toolInput['file_path'], toolInput['notebook_path']),
    };
  }
  if (input.hook_event_name === 'PreToolUse' && tool === 'Bash') {
    return { kind: 'commands', subject: firstPresent(toolInput['command']) };
  }
  if (!isOutputTool(input, tool)) return null;
  if (/\.md\b/u.test(jqToString(input.tool_input ?? null))) return null;
  return { kind: 'output', subject: readOutput(input) };
}

function createMatcher(): (pattern: string, subject: string) => boolean {
  const compiled = new Map<string, RegExp | null>();
  return (pattern, subject) => {
    if (!compiled.has(pattern)) {
      try {
        compiled.set(pattern, toJavaScriptPattern(pattern));
      } catch {
        compiled.set(pattern, null);
      }
    }
    return compiled.get(pattern)?.test(subject) ?? false;
  };
}

export function splitPathTokens(command: string): string[] {
  if (command === '') return [];
  const tokens = command.split(PATH_TOKEN_SEPARATORS);
  return tokens.length > 1 && tokens.at(-1) === '' ? tokens.slice(0, -1) : tokens;
}

function matchEntries(
  entries: readonly KnowledgeEntry[],
  kind: TriggerKind,
  subject: string,
): string[] {
  const matches = createMatcher();
  const isNamedByPattern = (entry: KnowledgeEntry): boolean =>
    entry[kind].some((pattern) => matches(pattern, subject));
  const tokens = kind === 'commands' ? splitPathTokens(subject) : [];
  const isNamingAPath = (entry: KnowledgeEntry): boolean =>
    entry.paths.some((pattern) => tokens.some((token) => matches(pattern, token)));
  const byPattern = entries.filter(isNamedByPattern).map((entry) => entry.path);
  const byPath = entries.filter(isNamingAPath).map((entry) => entry.path);
  return [...new Set([...byPattern, ...byPath])];
}

function selectMatches(entries: readonly KnowledgeEntry[], moment: Moment): string[] {
  const matched = matchEntries(entries, moment.kind, moment.subject);
  if (moment.kind !== 'commands' || matched.length === 0) return matched;
  const invoked = dropTrailingNewlines(stripStringBodies(moment.subject));
  return matchEntries(entries, 'commands', invoked);
}

function openSeenFile(input: HookInput, world: HookWorld): string | null {
  const session = [input.session_id, input.agent_id]
    .filter((part) => typeof part === 'string' && part !== '')
    .join('-')
    .replace(/[^A-Za-z0-9_-]/gu, '');
  if (session === '') return null;
  const temporaryDirectory = world.readEnvironment('TMPDIR') || '/tmp';
  const seen = `${temporaryDirectory}/knowledge-triggers-${session}.seen`;
  return world.run('touch', [seen]).status === 0 ? seen : null;
}

function selectFresh(matched: readonly string[], seen: string | null, world: HookWorld): string[] {
  const seenLines = new Set((seen === null ? null : world.readText(seen))?.split('\n'));
  const fresh = matched.filter((entry) => !seenLines.has(entry)).slice(0, MAXIMUM_ENTRIES);
  if (seen !== null && fresh.length > 0) world.run('tee', ['-a', seen], `${fresh.join('\n')}\n`);
  return fresh;
}

export function renderKnowledgeContext(
  entries: readonly KnowledgeEntry[],
  selected: readonly string[],
  kind: TriggerKind,
): string {
  const found = entries.filter((entry) => selected.includes(entry.path));
  const isOne = found.length === 1;
  const lines = found.map((entry) => `- \`${entry.path}\`: ${entry.summary}`);
  return (
    `[knowledge] ${MOMENTS[kind]} matches ${isOne ? 'a knowledge entry' : 'knowledge entries'}` +
    ` written after the same moment cost a session before. Read ${isOne ? 'it' : 'them'}` +
    ` before concluding anything:\n\n${lines.join('\n')}`
  );
}

function runKnowledgeTriggers(input: HookInput, world: HookWorld): Verdict {
  const moment = selectMoment(input);
  if (moment === null) return PASS;
  const lookup = readFreshLookup(world);
  if (lookup === null) return PASS;
  const subject = dropTrailingNewlines(moment.subject);
  if (subject === '') return PASS;
  const entries = parseLookup(lookup);
  const matched = selectMatches(entries, { kind: moment.kind, subject });
  if (matched.length === 0) return PASS;
  const selected = selectFresh(matched, openSeenFile(input, world), world);
  if (selected.length === 0) return PASS;
  return { kind: 'context', text: renderKnowledgeContext(entries, selected, moment.kind) };
}

export const knowledgeTriggersBeforeTool: Check = {
  name: 'knowledge-triggers',
  tools: /^(?:Write|Edit|MultiEdit|NotebookEdit|Bash)$/u,
  run: runKnowledgeTriggers,
};

export const knowledgeTriggersAfterTool: Check = {
  name: 'knowledge-triggers',
  tools: /^(?:Bash|mcp__.*)$/u,
  run: runKnowledgeTriggers,
};

export const knowledgeTriggersOnFailure: Check = {
  name: 'knowledge-triggers',
  tools: /^Bash$/u,
  run: runKnowledgeTriggers,
};
