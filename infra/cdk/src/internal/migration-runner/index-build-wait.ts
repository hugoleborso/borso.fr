import type postgres from 'postgres';
import {
  classifyIndexBuildJob,
  describeInvalidIndex,
  describeMissingIndex,
  hasWaitLimitPassed,
  INDEX_BUILD_JOB_QUERY,
  INDEX_VALIDITY_QUERY,
  type IndexBuildJobRow,
  type IndexBuildStep,
  type IndexValidityRow,
  planIndexBuildStep,
  readCreatedIndexName,
  selectSubmittedJobIds,
  type StatementRow,
} from './index-build-jobs.utils.js';

const INDEX_BUILD_POLL_INTERVAL_MS = 2_000;

async function pauseBeforeNextPoll(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, INDEX_BUILD_POLL_INTERVAL_MS));
}

async function assertIndexIsValid(
  sql: postgres.Sql,
  schemaName: string,
  indexName: string,
): Promise<void> {
  const [index] = await sql.unsafe<IndexValidityRow[]>(INDEX_VALIDITY_QUERY, [
    schemaName,
    indexName,
  ]);
  if (index === undefined) throw new Error(describeMissingIndex(indexName));
  if (!index.is_valid) throw new Error(describeInvalidIndex(indexName));
}

async function finishIndexBuild(
  sql: postgres.Sql,
  schemaName: string,
  indexName: string,
  step: Exclude<IndexBuildStep, { readonly kind: 'poll-again' }>,
): Promise<void> {
  if (step.kind === 'failed') throw new Error(step.message);
  if (step.kind === 'settled') return;
  await assertIndexIsValid(sql, schemaName, indexName);
}

async function waitForIndexBuild(
  sql: postgres.Sql,
  schemaName: string,
  indexName: string,
  jobId: string,
  deadlineMilliseconds: number,
): Promise<void> {
  for (;;) {
    const progress = classifyIndexBuildJob(
      await sql.unsafe<IndexBuildJobRow[]>(INDEX_BUILD_JOB_QUERY, [jobId]),
    );
    const step = planIndexBuildStep({
      progress,
      isPastWaitLimit: hasWaitLimitPassed(Date.now(), deadlineMilliseconds),
      indexName,
      jobId,
    });
    if (step.kind !== 'poll-again') return finishIndexBuild(sql, schemaName, indexName, step);
    await pauseBeforeNextPoll();
  }
}

export async function settleIndexBuild(
  sql: postgres.Sql,
  schemaName: string,
  statement: string,
  statementRows: readonly StatementRow[],
  deadlineMilliseconds: number,
): Promise<void> {
  const indexName = readCreatedIndexName(statement);
  if (indexName === null) return;
  const jobIds = selectSubmittedJobIds(statementRows);
  if (jobIds.length === 0) {
    await assertIndexIsValid(sql, schemaName, indexName);
    return;
  }
  for (const jobId of jobIds) {
    await waitForIndexBuild(sql, schemaName, indexName, jobId, deadlineMilliseconds);
  }
}
