export interface IndexBuildJobRow {
  readonly status: string;
  readonly details: string | null;
}

export interface IndexValidityRow {
  readonly is_valid: boolean;
}

export type IndexBuildProgress =
  | { readonly kind: 'running'; readonly status: string }
  | { readonly kind: 'completed' }
  | { readonly kind: 'failed'; readonly details: string }
  | { readonly kind: 'untracked' };

export const MIGRATION_RUNNER_TIMEOUT_SECONDS = 300;
const SHUTDOWN_MARGIN_SECONDS = 60;
export const INDEX_BUILD_WAIT_LIMIT_SECONDS =
  MIGRATION_RUNNER_TIMEOUT_SECONDS - SHUTDOWN_MARGIN_SECONDS;
const MILLISECONDS_PER_SECOND = 1000;

export const INDEX_BUILD_JOB_QUERY = 'SELECT status, details FROM sys.jobs WHERE job_id = $1';

export const INDEX_VALIDITY_QUERY =
  'SELECT index_entry.indisvalid AS is_valid FROM pg_index AS index_entry ' +
  'JOIN pg_class AS index_relation ON index_relation.oid = index_entry.indexrelid ' +
  'JOIN pg_namespace AS index_schema ON index_schema.oid = index_relation.relnamespace ' +
  'WHERE index_schema.nspname = $1 AND index_relation.relname = $2';

const COMPLETED_STATUS = 'completed';
const FAILED_STATUS = 'failed';
const JOB_ID_COLUMN = 'job_id';
const NO_FAILURE_DETAILS = 'sys.jobs gave no details';

const CREATED_INDEX_NAME =
  /\bCREATE\s+(?:UNIQUE\s+)?INDEX\s+ASYNC\s+(?:IF\s+NOT\s+EXISTS\s+)?("(?:[^"]|"")+"|[A-Za-z_][A-Za-z0-9_$]*)/i;
const QUOTED_IDENTIFIER = /^"(.*)"$/s;
const ESCAPED_QUOTE = /""/g;

export type StatementRow = Readonly<Record<string, unknown>>;

function readJobId(row: StatementRow): string | null {
  const jobId = row[JOB_ID_COLUMN];
  return typeof jobId === 'string' && jobId.length > 0 ? jobId : null;
}

// @FollowsBlueprint utils-pure-module
export function selectSubmittedJobIds(rows: readonly StatementRow[]): readonly string[] {
  return rows.map(readJobId).filter((jobId): jobId is string => jobId !== null);
}

export function readCreatedIndexName(statement: string): string | null {
  const created = CREATED_INDEX_NAME.exec(statement);
  const identifier = created?.[1];
  if (identifier === undefined) return null;
  const quoted = QUOTED_IDENTIFIER.exec(identifier);
  return quoted?.[1] === undefined
    ? identifier.toLowerCase()
    : quoted[1].replace(ESCAPED_QUOTE, '"');
}

export function classifyIndexBuildJob(rows: readonly IndexBuildJobRow[]): IndexBuildProgress {
  const [job] = rows;
  if (job === undefined) return { kind: 'untracked' };
  if (job.status === COMPLETED_STATUS) return { kind: 'completed' };
  if (job.status === FAILED_STATUS) {
    return { kind: 'failed', details: job.details ?? NO_FAILURE_DETAILS };
  }
  return { kind: 'running', status: job.status };
}

export function computeIndexBuildDeadline(startedAtMilliseconds: number): number {
  return startedAtMilliseconds + INDEX_BUILD_WAIT_LIMIT_SECONDS * MILLISECONDS_PER_SECOND;
}

export function hasWaitLimitPassed(nowMilliseconds: number, deadlineMilliseconds: number): boolean {
  return nowMilliseconds >= deadlineMilliseconds;
}

export interface IndexBuildStepInput {
  readonly progress: IndexBuildProgress;
  readonly isPastWaitLimit: boolean;
  readonly indexName: string;
  readonly jobId: string;
}

export type IndexBuildStep =
  | { readonly kind: 'poll-again' }
  | { readonly kind: 'settled' }
  | { readonly kind: 'check-index' }
  | { readonly kind: 'failed'; readonly message: string };

export function planIndexBuildStep(input: IndexBuildStepInput): IndexBuildStep {
  const { progress, indexName, jobId } = input;
  if (progress.kind === 'completed') return { kind: 'settled' };
  if (progress.kind === 'untracked') return { kind: 'check-index' };
  if (progress.kind === 'failed') {
    return {
      kind: 'failed',
      message: describeFailedIndexBuild(indexName, jobId, progress.details),
    };
  }
  if (!input.isPastWaitLimit) return { kind: 'poll-again' };
  return {
    kind: 'failed',
    message: describeUnfinishedIndexBuild(indexName, jobId, progress.status),
  };
}

export function describeFailedIndexBuild(
  indexName: string,
  jobId: string,
  details: string,
): string {
  return (
    `The build of index "${indexName}" failed (sys.jobs ${jobId}): ${details}. ` +
    `DSQL keeps the index INVALID, and a unique one still refuses writes that break it. ` +
    `Fix the rows that break it, DROP INDEX "${indexName}", then deploy again.`
  );
}

export function describeUnfinishedIndexBuild(
  indexName: string,
  jobId: string,
  lastStatus: string,
): string {
  return (
    `The build of index "${indexName}" (sys.jobs ${jobId}, last status "${lastStatus}") ` +
    `had not finished within the ${String(INDEX_BUILD_WAIT_LIMIT_SECONDS)} s a deploy waits ` +
    `for all of its index builds, so the migration is not recorded as applied. ` +
    `Deploy again once sys.jobs shows it completed or failed.`
  );
}

export function describeInvalidIndex(indexName: string): string {
  return (
    `Index "${indexName}" exists but is INVALID, which is what DSQL leaves after a failed build. ` +
    `Fix the rows that break it, DROP INDEX "${indexName}", then deploy again.`
  );
}

export function describeMissingIndex(indexName: string): string {
  return (
    `The migration asked for index "${indexName}", DSQL returned no build job for it, ` +
    `and no index of that name exists.`
  );
}
