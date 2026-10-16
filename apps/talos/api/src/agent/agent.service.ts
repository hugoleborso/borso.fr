import { TalosError } from '../helpers/errors/talos-error.types';
import { readTalosSecret } from '../helpers/secrets/secrets.setup';
import { applyChanges, type ChangeCaller } from '../memory/memory-changes.service';
import type { ChangeRequest } from '../memory/memory-changes.schema';
import { readMemoryPage } from '../memory/memory-page.service';
import {
  composeMemoryContext,
  exportMemory,
  lintMemory,
  readMemoryDocument,
  readMemoryState,
  readMemoryStatus,
  readNeighbours,
  readPath,
  runMemoryQuery,
  searchMemory,
} from '../memory/memory-read.service';
import { AGENT_TOKEN_NAMES, type AgentTokenName, selectAgentTokenName } from './agent-token.core';

// @FollowsBlueprint service-orchestration
export async function authorizeAgent(
  authorizationHeader: string | undefined,
): Promise<AgentTokenName> {
  const configured = await Promise.all(
    AGENT_TOKEN_NAMES.map(async (name) => ({
      name,
      value: await readTalosSecret(`agent-token-${name}`),
    })),
  );
  const tokenName = selectAgentTokenName(authorizationHeader, configured);
  if (tokenName === null) throw new TalosError('invalid-agent-token');
  return tokenName;
}

export async function recordAgentChanges(
  request: ChangeRequest,
  tokenName: AgentTokenName,
): Promise<Awaited<ReturnType<typeof applyChanges>>> {
  const caller: ChangeCaller = { tokenName, now: new Date() };
  return await applyChanges(request, caller);
}

export async function readAgentContext(budgetBytes: number): Promise<{ markdown: string }> {
  return { markdown: await composeMemoryContext(budgetBytes, new Date()) };
}

export async function lintAgentMemory() {
  return { issues: await lintMemory(new Date()) };
}

export async function exportAgentMemory() {
  return await exportMemory(new Date());
}

export async function searchAgentMemory(query: string, limit: number) {
  return { items: await searchMemory(query, limit) };
}

export async function readAgentPath(from: string, target: string, date: string | undefined) {
  return { path: await readPath(from, target, date ?? null) };
}

export async function readAgentNeighbours(slug: string, date: string | undefined, depth: number) {
  return await readNeighbours(slug, date ?? null, depth);
}

export { readMemoryDocument, readMemoryPage, readMemoryState, readMemoryStatus, runMemoryQuery };
