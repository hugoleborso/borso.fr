import { describe, expect, it } from 'vitest';
import { buildDsqlClientOptions, buildLocalClientOptions } from './client-options.core';

const CONNECTION = {
  endpoint: 'cluster.dsql.eu-west-3.on.aws',
  schemaName: 'pragma_prod',
  roleName: 'pragma_api',
};

async function readPassword(): Promise<string> {
  return 'token';
}

describe('the options each database client is opened with', () => {
  it('opens the DSQL client without the array-type query postgres.js sends on every connection', () => {
    expect(buildDsqlClientOptions(CONNECTION, readPassword)).toEqual({
      types: { bigint: expect.anything() },
      fetch_types: false,
      host: 'cluster.dsql.eu-west-3.on.aws',
      port: 5432,
      database: 'postgres',
      user: 'pragma_api',
      ssl: 'require',
      password: readPassword,
      connection: { search_path: 'pragma_prod' },
    });
  });

  it('opens the local client with the same settings, so the back-e2e suite runs what production runs', () => {
    expect(buildLocalClientOptions()).toEqual({
      types: { bigint: expect.anything() },
      fetch_types: false,
    });
  });
});
