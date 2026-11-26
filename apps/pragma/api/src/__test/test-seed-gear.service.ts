import { randomUUID } from 'node:crypto';
import { createGearItem } from '../gear-items/gear-items.service';
import { SEED_GEAR_ITEMS, selectSeedGearHolding } from './test-seed-gear.core';

// @FollowsBlueprint service-orchestration
export async function seedConcertGear(
  concertId: string,
  memberIdByName: ReadonlyMap<string, string>,
): Promise<void> {
  for (const item of SEED_GEAR_ITEMS) {
    const outcome = await createGearItem(concertId, {
      id: randomUUID(),
      label: item.label,
      ...selectSeedGearHolding(item, memberIdByName),
    });
    if (outcome.kind !== 'ok') throw new Error(`the seeded gear item was refused: ${outcome.kind}`);
  }
}
