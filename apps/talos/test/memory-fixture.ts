import { readFileSync } from 'node:fs';
import { buildTestContext, requestJson, TEST_SECRETS } from './app-utils';

const SEED_PATH = new URL('./memory-seed.json', import.meta.url);
const AGENT_HEADERS = { authorization: `Bearer ${TEST_SECRETS['agent-token-mac'] ?? ''}` };

export const MEMORY_SEED: unknown = JSON.parse(readFileSync(SEED_PATH, 'utf8'));

// @FollowsBlueprint test-fixtures-object-mother
export async function writeMemory(operations: unknown, idempotencyKey: string): Promise<void> {
  const { app } = buildTestContext();
  const response = await requestJson(app, '/api/agent/changes', {
    method: 'POST',
    headers: AGENT_HEADERS,
    body: { idempotencyKey, actor: 'import', operations },
  });
  if (response.status !== 200) throw new Error(`seed refused: ${await response.text()}`);
}

export async function seedMemoryInDatabase(): Promise<void> {
  await writeMemory(MEMORY_SEED, 'seed');
}

export async function readMemoryEvents(): Promise<{ actor: string; operation: string }[]> {
  const { app } = buildTestContext();
  const response = await requestJson(app, '/api/agent/export', { headers: AGENT_HEADERS });
  const exported: { tables: { memory_event: { actor: string; operation: string }[] } } =
    await response.json();
  return exported.tables.memory_event;
}
