import { afterEach, describe, expect, it, vi } from 'vitest';

const openClient = vi.hoisted(() => vi.fn(() => ({})));

vi.mock('postgres', () => ({ default: Object.assign(openClient, { BigInt: {} }) }));
vi.mock('drizzle-orm/postgres-js', () => ({ drizzle: () => ({}) }));
vi.mock('@aws-sdk/dsql-signer', () => ({ DsqlSigner: vi.fn() }));
vi.mock('../helpers/persistence/conflict-abort.core', () => ({
  retryingConflictAbortsOf: (client: unknown) => client,
}));

async function openDatabase(): Promise<void> {
  vi.resetModules();
  const { getDatabase } = await import('./client');
  getDatabase();
}

describe('the options each database client is opened with', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('opens the DSQL client without the array-type query postgres.js sends on every connection', async () => {
    vi.stubEnv('DSQL_ENDPOINT', 'cluster.dsql.eu-west-3.on.aws');
    vi.stubEnv('DSQL_SCHEMA', 'pragma_prod');
    vi.stubEnv('DSQL_ROLE', 'pragma_api');
    vi.stubEnv('DATABASE_URL', '');

    await openDatabase();

    expect(openClient).toHaveBeenCalledWith(
      expect.objectContaining({ host: 'cluster.dsql.eu-west-3.on.aws', fetch_types: false }),
    );
  });

  it('opens the local client the same way, so the suite runs the setting production runs', async () => {
    vi.stubEnv('DSQL_ENDPOINT', '');
    vi.stubEnv('DATABASE_URL', 'postgres://localhost/pragma');

    await openDatabase();

    expect(openClient).toHaveBeenCalledWith(
      'postgres://localhost/pragma',
      expect.objectContaining({ fetch_types: false }),
    );
  });
});
