import postgres from 'postgres';
import { setup as applyMigrations } from './setup-postgres';

const DEVELOPMENT_ADMIN_PIN = 'lastloop';
const DEVELOPMENT_ADMIN_PIN_HASH =
  'scrypt$6ccc66eb93981b9b83e8817f584ca8f5$60191a1c31f18e88590e0e5c6995d1d6f7f0f053b6ffce8e3ea4288c56bd0e790d6a340ad59de2d29792c9d471ad144907d5d10e05ef03d0aea5f6383f734107';

async function prepareDevelopmentDatabase(): Promise<void> {
  await applyMigrations();
  const sql = postgres(process.env.DATABASE_URL ?? '', { max: 1, onnotice: () => undefined });
  try {
    await sql`INSERT INTO admin_credentials (id, scrypt_hash) VALUES (1, ${DEVELOPMENT_ADMIN_PIN_HASH}) ON CONFLICT (id) DO NOTHING`;
  } finally {
    await sql.end({ timeout: 5 });
  }
  process.stdout.write(`[dev:db] migrations applied, admin PIN seeded: ${DEVELOPMENT_ADMIN_PIN}\n`);
}

await prepareDevelopmentDatabase();
