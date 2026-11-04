import type { ToolAnswer } from '../mcp/mcp.service';
import type { WriteActor } from '../notifications/notifications.service';
import { insertBreak, removeBreakAndCompact, renameBreak } from './setlist-break.service';
import type { BreakToolAction } from './setlist-tool.core';

const BREAK_NOT_FOUND: ToolAnswer = { kind: 'refused', body: { error: 'not-found' } };
export const BREAK_UNCLEAR: ToolAnswer = {
  kind: 'refused',
  body: { error: 'break-needs-after-or-break' },
};

type BreakAction<Kind extends BreakToolAction['kind']> = Extract<BreakToolAction, { kind: Kind }>;

export async function removeBreakForTool(
  setlistId: string,
  action: BreakAction<'remove'>,
  actor: WriteActor,
): Promise<ToolAnswer> {
  const removed = await removeBreakAndCompact(setlistId, action.breakId, actor);
  if (removed.kind === 'not-found') return BREAK_NOT_FOUND;
  return { kind: 'answered', body: { setlistId, removed: action.breakId } };
}

export async function renameBreakForTool(
  setlistId: string,
  action: BreakAction<'rename'>,
  actor: WriteActor,
): Promise<ToolAnswer> {
  const renamed = await renameBreak(setlistId, action.breakId, action.label, actor);
  if (renamed.kind === 'not-found') return BREAK_NOT_FOUND;
  return { kind: 'answered', body: { breakId: action.breakId, label: renamed.setlistBreak.label } };
}

export async function addBreakForTool(
  setlistId: string,
  placement: { readonly afterEntryId: string; readonly label: string },
  actor: WriteActor,
): Promise<ToolAnswer> {
  const added = await insertBreak(setlistId, placement, actor);
  if (added.kind !== 'ok') return BREAK_NOT_FOUND;
  return { kind: 'answered', body: { setlistId, breakId: added.setlistBreak.id } };
}
