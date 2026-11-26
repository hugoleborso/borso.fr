// @FollowsBlueprint utils-pure-module
const EVENT_ENTRY_FILES = {
  PreToolUse: 'pre-tool-use.ts',
  PostToolUse: 'post-tool-use.ts',
  PostToolUseFailure: 'post-tool-use-failure.ts',
  Stop: 'stop.ts',
  SessionStart: 'session-start.ts',
} as const satisfies Readonly<Record<string, string>>;

interface SettingsHookCommand {
  readonly event: string;
  readonly command: string;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readArray(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : [];
}

function readCommandsOfGroup(event: string, group: unknown): SettingsHookCommand[] {
  if (!isRecord(group)) return [];
  return readArray(group['hooks']).flatMap((hook) =>
    isRecord(hook) && typeof hook['command'] === 'string'
      ? [{ event, command: hook['command'] }]
      : [],
  );
}

export function listSettingsHookCommands(settings: unknown): SettingsHookCommand[] {
  if (!isRecord(settings) || !isRecord(settings['hooks'])) return [];
  return Object.entries(settings['hooks']).flatMap(([event, groups]) =>
    readArray(groups).flatMap((group) => readCommandsOfGroup(event, group)),
  );
}

function isKnownEvent(event: string): event is keyof typeof EVENT_ENTRY_FILES {
  return Object.hasOwn(EVENT_ENTRY_FILES, event);
}

export function expectedEntryCommand(event: string): string | null {
  if (!isKnownEvent(event)) return null;
  const entryFile = EVENT_ENTRY_FILES[event];
  return `node "$CLAUDE_PROJECT_DIR"/scripts/hooks/${entryFile}`;
}

export function selectForeignHookCommands(settings: unknown): SettingsHookCommand[] {
  return listSettingsHookCommands(settings).filter(
    ({ event, command }) => command !== expectedEntryCommand(event),
  );
}
