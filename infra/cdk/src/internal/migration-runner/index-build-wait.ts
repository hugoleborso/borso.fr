import type postgres from 'postgres';
import {
  classifyIndexBuildJob,
  describeInvalidIndex,
  describeMissingIndex,
  hasWaitLimitPassed,
  INDEX_BUILD_JOB_QUERY,
  INDEX_VALIDITY_QUERY,
  type IndexBuildJobRow,
  type IndexValidityRow,
  planIndexBuildStep,
  readCreatedIndexName,
  selectSubmittedJobIds,
  type StatementRow,
} from './index-build-jobs.utils.js';

const INDEX_BUILD_POLL_INTERVAL_MS = 2_000;
const INDEX_BUILD_WAIT_LIMIT_SECONDS = 240;

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

async function waitForIndexBuild(
  sql: postgres.Sql,
  schemaName: string,
  indexName: string,
  jobId: string,
): Promise<void> {
  const deadline = Date.now() + INDEX_BUILD_WAIT_LIMIT_SECONDS * 1000;
  for (;;) {
    const progress = classifyIndexBuildJob(
      await sql.unsafe<IndexBuildJobRow[]>(INDEX_BUILD_JOB_QUERY, [jobId]),
    );
    const step = planIndexBuildStep({
      progress,
      isPastWaitLimit: hasWaitLimitPassed(Date.now(), deadline),
      indexName,
      jobId,
      waitLimitSeconds: INDEX_BUILD_WAIT_LIMIT_SECONDS,
    });
    if (step.failure !== null) throw new Error(step.failure);
    if (step.isSettled) return;
    if (step.needsIndexCheck) {
      await assertIndexIsValid(sql, schemaName, indexName);
      return;
    }
    await pauseBeforeNextPoll();
  }
}

export async function settleIndexBuild(
  sql: postgres.Sql,
  schemaName: string,
  statement: string,
  statementRows: readonly StatementRow[],
): Promise<void> {
  const indexName = readCreatedIndexName(statement);
  if (indexName === null) return;
  const jobIds = selectSubmittedJobIds(statementRows);
  if (jobIds.length === 0) {
    await assertIndexIsValid(sql, schemaName, indexName);
    return;
  }
  for (const jobId of jobIds) {
    await waitForIndexBuild(sql, schemaName, indexName, jobId);
  }
}
