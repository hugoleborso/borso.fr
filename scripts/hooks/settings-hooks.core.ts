// @FollowsBlueprint utils-pure-module
import type { Check, HookEvent } from './check.core.ts';

export const HOOK_COMMAND = 'node "$CLAUDE_PROJECT_DIR"/scripts/hooks/hook.ts';

interface SettingsHookCommand {
  readonly event: string;
  readonly command: string;
  readonly matcher: string;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readArray(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : [];
}

function readCommandsOfGroup(event: string, group: unknown): SettingsHookCommand[] {
  if (!isRecord(group)) return [];
  const matcher = typeof group['matcher'] === 'string' ? group['matcher'] : '';
  return readArray(group['hooks']).flatMap((hook) =>
    isRecord(hook) && typeof hook['command'] === 'string'
      ? [{ event, matcher, command: hook['command'] }]
      : [],
  );
}

export function listSettingsHookCommands(settings: unknown): SettingsHookCommand[] {
  if (!isRecord(settings) || !isRecord(settings['hooks'])) return [];
  return Object.entries(settings['hooks']).flatMap(([event, groups]) =>
    readArray(groups).flatMap((group) => readCommandsOfGroup(event, group)),
  );
}

export function selectForeignHookCommands(settings: unknown): SettingsHookCommand[] {
  return listSettingsHookCommands(settings).filter(({ command }) => command !== HOOK_COMMAND);
}

function listToolsNamedBy(check: Check): string[] {
  if (check.tools === null) return [];
  return check.tools.source
    .replace(/^\^\(?(?:\?:)?/u, '')
    .replace(/\)?\$$/u, '')
    .split('|');
}

function isMatchedBy(matcher: string, toolName: string): boolean {
  return matcher === '' || matcher === '*' || new RegExp(`^(?:${matcher})$`, 'u').test(toolName);
}

export function listToolsNoMatcherReaches(
  settings: unknown,
  checksByEvent: Readonly<Record<HookEvent, readonly Check[]>>,
): string[] {
  const commands = listSettingsHookCommands(settings);
  return Object.entries(checksByEvent).flatMap(([event, checks]) =>
    checks
      .flatMap(listToolsNamedBy)
      .flatMap((toolName) =>
        commands.some(
          (command) => command.event === event && isMatchedBy(command.matcher, toolName),
        )
          ? []
          : [`${event} ${toolName}`],
      ),
  );
}
