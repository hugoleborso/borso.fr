import { planConcurrencyRetry } from './concurrency-retry.utils.js';

export async function runRetryingConcurrencyConflicts(
  work: () => Promise<void>,
  attempt = 1,
): Promise<void> {
  try {
    await work();
  } catch (error) {
    const step = planConcurrencyRetry(error, attempt);
    if (!step.isRetried) throw error;
    await new Promise((resolve) => setTimeout(resolve, step.delayMilliseconds));
    await runRetryingConcurrencyConflicts(work, attempt + 1);
  }
}
