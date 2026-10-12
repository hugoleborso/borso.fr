import { SEED_MEMBERS } from '../api/src/__test/test-seed-fixture.core';
import { seedPreviewFixture } from '../api/src/__test/test-seed.service';
import { getDatabase } from '../api/src/database/client';
import { setup as applyMigrations } from './setup-postgres';

const DEFAULT_API_PORT = 3001;
const DEVELOPMENT_API_ORIGIN = `http://localhost:${process.env.PORT ?? String(DEFAULT_API_PORT)}`;

async function prepareDevelopmentDatabase(): Promise<void> {
  await applyMigrations();
  const summary = await seedPreviewFixture(new Date(), DEVELOPMENT_API_ORIGIN);
  await getDatabase().$client.end();
  process.stdout.write(
    `[dev:db] migrations applied, fixture seeded: ${String(summary.members)} members, shared password "${summary.adminPassword}"\n` +
      `[dev:db] sign in as any of: ${SEED_MEMBERS.map((member) => member.firstName).join(', ')}\n`,
  );
}

await prepareDevelopmentDatabase();
