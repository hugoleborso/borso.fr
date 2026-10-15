import { describe, expect, it } from 'vitest';
import {
  apiRoleName,
  buildRoleExistsQuery,
  buildRoleMappingsQuery,
  buildRoleProvisioningStatements,
  buildRoleRemovalStatements,
  selectMappedArns,
} from './database-role.utils.js';

const LAMBDA_ROLE_ARN = 'arn:aws:iam::123456789012:role/pragma-pr-42-ApiFnServiceRole-ABC';
const OTHER_ROLE_ARN = 'arn:aws:iam::123456789012:role/pragma-pr-42-ChannelRole-XYZ';
const STALE_ROLE_ARN = 'arn:aws:iam::123456789012:role/pragma-pr-42-OldRole-OLD';

describe('apiRoleName', () => {
  it('prefixes the schema name', () => {
    expect(apiRoleName('pr_42')).toBe('api_pr_42');
    expect(apiRoleName('prod')).toBe('api_prod');
  });

  it('refuses a schema name that is not a plain identifier', () => {
    expect(() => apiRoleName('pr-42')).toThrow('Invalid schema name: "pr-42"');
  });
});

describe('role catalogue queries', () => {
  it('asks pg_roles for the role', () => {
    expect(buildRoleExistsQuery('api_prod')).toBe(
      "SELECT 1 AS present FROM pg_roles WHERE rolname = 'api_prod'",
    );
  });

  it('asks the IAM mapping table for the role', () => {
    expect(buildRoleMappingsQuery('api_prod')).toBe(
      "SELECT arn, pg_role_name FROM sys.iam_pg_role_mappings WHERE pg_role_name = 'api_prod'",
    );
  });

  it('refuses a role name that could break out of the literal', () => {
    expect(() => buildRoleExistsQuery("api'; DROP")).toThrow('Invalid role name');
    expect(() => buildRoleMappingsQuery("api'; DROP")).toThrow('Invalid role name');
  });
});

describe('selectMappedArns', () => {
  it('keeps only the rows of the role', () => {
    expect(
      selectMappedArns(
        [
          { arn: LAMBDA_ROLE_ARN, pg_role_name: 'api_prod' },
          { arn: OTHER_ROLE_ARN, pg_role_name: 'api_pr_1' },
        ],
        'api_prod',
      ),
    ).toStrictEqual([LAMBDA_ROLE_ARN]);
  });
});

describe('buildRoleProvisioningStatements', () => {
  it('creates, maps and grants a role that does not exist yet', () => {
    expect(
      buildRoleProvisioningStatements({
        schemaName: 'pr_42',
        roleName: 'api_pr_42',
        principalArns: [LAMBDA_ROLE_ARN, OTHER_ROLE_ARN],
        roleExists: false,
        mappedArns: [],
      }),
    ).toStrictEqual([
      'CREATE ROLE "api_pr_42" WITH LOGIN',
      `AWS IAM GRANT "api_pr_42" TO '${LAMBDA_ROLE_ARN}'`,
      `AWS IAM GRANT "api_pr_42" TO '${OTHER_ROLE_ARN}'`,
      'GRANT USAGE ON SCHEMA "pr_42" TO "api_pr_42"',
      'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "pr_42" TO "api_pr_42"',
    ]);
  });

  it('only re-grants the tables when everything is already in place', () => {
    expect(
      buildRoleProvisioningStatements({
        schemaName: 'prod',
        roleName: 'api_prod',
        principalArns: [LAMBDA_ROLE_ARN],
        roleExists: true,
        mappedArns: [LAMBDA_ROLE_ARN],
      }),
    ).toStrictEqual([
      'GRANT USAGE ON SCHEMA "prod" TO "api_prod"',
      'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "prod" TO "api_prod"',
    ]);
  });

  it('unmaps a principal that is no longer wanted', () => {
    expect(
      buildRoleProvisioningStatements({
        schemaName: 'prod',
        roleName: 'api_prod',
        principalArns: [LAMBDA_ROLE_ARN],
        roleExists: true,
        mappedArns: [STALE_ROLE_ARN, LAMBDA_ROLE_ARN],
      }),
    ).toStrictEqual([
      `AWS IAM REVOKE "api_prod" FROM '${STALE_ROLE_ARN}'`,
      'GRANT USAGE ON SCHEMA "prod" TO "api_prod"',
      'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "prod" TO "api_prod"',
    ]);
  });

  it('refuses an ARN that is not an IAM role', () => {
    expect(() =>
      buildRoleProvisioningStatements({
        schemaName: 'prod',
        roleName: 'api_prod',
        principalArns: ["arn:aws:iam::123456789012:role/x'; DROP SCHEMA prod; --"],
        roleExists: true,
        mappedArns: [],
      }),
    ).toThrow('Invalid IAM role ARN');
    expect(() =>
      buildRoleProvisioningStatements({
        schemaName: 'prod',
        roleName: 'api_prod',
        principalArns: ['arn:aws:iam::123456789012:user/someone'],
        roleExists: true,
        mappedArns: [],
      }),
    ).toThrow('Invalid IAM role ARN');
  });

  it('refuses an invalid schema or role name', () => {
    const valid = {
      schemaName: 'prod',
      roleName: 'api_prod',
      principalArns: [],
      roleExists: true,
      mappedArns: [],
    };
    expect(() => buildRoleProvisioningStatements({ ...valid, schemaName: 'a b' })).toThrow(
      'Invalid schema name',
    );
    expect(() => buildRoleProvisioningStatements({ ...valid, roleName: 'a"b' })).toThrow(
      'Invalid role name',
    );
  });
});

describe('buildRoleRemovalStatements', () => {
  it('unmaps every principal, then drops the role', () => {
    expect(
      buildRoleRemovalStatements({
        roleName: 'api_pr_42',
        roleExists: true,
        mappedArns: [LAMBDA_ROLE_ARN],
      }),
    ).toStrictEqual([
      `AWS IAM REVOKE "api_pr_42" FROM '${LAMBDA_ROLE_ARN}'`,
      'DROP ROLE IF EXISTS "api_pr_42"',
    ]);
  });

  it('does nothing for a schema created before roles existed', () => {
    expect(
      buildRoleRemovalStatements({ roleName: 'api_pr_7', roleExists: false, mappedArns: [] }),
    ).toStrictEqual([]);
  });

  it('refuses an invalid role name', () => {
    expect(() =>
      buildRoleRemovalStatements({ roleName: 'x y', roleExists: true, mappedArns: [] }),
    ).toThrow('Invalid role name');
  });
});
