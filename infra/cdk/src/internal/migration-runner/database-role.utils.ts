const IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
const IAM_ROLE_ARN_PATTERN = /^arn:aws:iam::\d{12}:role\/[\w+=,.@/-]+$/;
const API_ROLE_PREFIX = 'api_';
const TABLE_PRIVILEGES = 'SELECT, INSERT, UPDATE, DELETE';

export interface RoleMappingRow {
  readonly arn: string;
  readonly pg_role_name: string;
}

export interface RoleProvisioningInput {
  readonly schemaName: string;
  readonly roleName: string;
  readonly principalArns: readonly string[];
  readonly roleExists: boolean;
  readonly mappedArns: readonly string[];
}

export interface RoleRemovalInput {
  readonly roleName: string;
  readonly roleExists: boolean;
  readonly mappedArns: readonly string[];
}

function assertIdentifier(name: string, kind: string): void {
  if (!IDENTIFIER_PATTERN.test(name)) {
    throw new Error(`Invalid ${kind} name: "${name}". Expected /^[A-Za-z_][A-Za-z0-9_]*$/.`);
  }
}

function assertIamRoleArn(arn: string): void {
  if (!IAM_ROLE_ARN_PATTERN.test(arn)) {
    throw new Error(`Invalid IAM role ARN: "${arn}".`);
  }
}

function quote(identifier: string): string {
  return `"${identifier}"`;
}

function buildMapStatement(roleName: string, arn: string): string {
  return `AWS IAM GRANT ${quote(roleName)} TO '${arn}'`;
}

function buildUnmapStatement(roleName: string, arn: string): string {
  return `AWS IAM REVOKE ${quote(roleName)} FROM '${arn}'`;
}

// @FollowsBlueprint utils-pure-module
export function apiRoleName(schemaName: string): string {
  assertIdentifier(schemaName, 'schema');
  return `${API_ROLE_PREFIX}${schemaName}`;
}

export function buildRoleExistsQuery(roleName: string): string {
  assertIdentifier(roleName, 'role');
  return `SELECT 1 AS present FROM pg_roles WHERE rolname = '${roleName}'`;
}

export function buildRoleMappingsQuery(roleName: string): string {
  assertIdentifier(roleName, 'role');
  return `SELECT arn, pg_role_name FROM sys.iam_pg_role_mappings WHERE pg_role_name = '${roleName}'`;
}

export function selectMappedArns(rows: readonly RoleMappingRow[], roleName: string): string[] {
  return rows.filter((row) => row.pg_role_name === roleName).map((row) => row.arn);
}

export function buildRoleProvisioningStatements(input: RoleProvisioningInput): string[] {
  assertIdentifier(input.schemaName, 'schema');
  assertIdentifier(input.roleName, 'role');
  for (const arn of input.principalArns) assertIamRoleArn(arn);
  const wanted = new Set(input.principalArns);
  const alreadyMapped = new Set(input.mappedArns);
  const creation = input.roleExists ? [] : [`CREATE ROLE ${quote(input.roleName)} WITH LOGIN`];
  const staleMappings = input.mappedArns
    .filter((arn) => !wanted.has(arn))
    .map((arn) => buildUnmapStatement(input.roleName, arn));
  const newMappings = input.principalArns
    .filter((arn) => !alreadyMapped.has(arn))
    .map((arn) => buildMapStatement(input.roleName, arn));
  return [
    ...creation,
    ...staleMappings,
    ...newMappings,
    `GRANT USAGE ON SCHEMA ${quote(input.schemaName)} TO ${quote(input.roleName)}`,
    `GRANT ${TABLE_PRIVILEGES} ON ALL TABLES IN SCHEMA ${quote(input.schemaName)} TO ${quote(input.roleName)}`,
  ];
}

export function buildRoleRemovalStatements(input: RoleRemovalInput): string[] {
  assertIdentifier(input.roleName, 'role');
  if (!input.roleExists) return [];
  return [
    ...input.mappedArns.map((arn) => buildUnmapStatement(input.roleName, arn)),
    `DROP ROLE IF EXISTS ${quote(input.roleName)}`,
  ];
}
