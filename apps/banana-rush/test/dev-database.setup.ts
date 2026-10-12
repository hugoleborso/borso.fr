import { setup as applyMigrations } from './setup-postgres';

await applyMigrations();
process.stdout.write('[dev:db] migrations applied\n');
