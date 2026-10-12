import { SEED_MEMBERS } from '../api/src/__test/test-seed-fixture.core';
import { seedPreviewFixture } from '../api/src/__test/test-seed.service';
import { getDatabase } from '../api/src/database/client';
import { setup as applyMigrations } from './setup-postgres';

async function prepareDevelopmentDatabase(): Promise<void> {
  await applyMigrations();
  const summary = await seedPreviewFixture(new Date());
  await getDatabase().$client.end();
  process.stdout.write(
    `[dev:db] migrations applied, fixture seeded: ${String(summary.members)} members, shared password "${summary.adminPassword}"\n` +
      `[dev:db] sign in as any of: ${SEED_MEMBERS.map((member) => member.firstName).join(', ')}\n`,
  );
}

await prepareDevelopmentDatabase();
