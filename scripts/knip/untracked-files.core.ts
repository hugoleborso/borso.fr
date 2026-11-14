import type { IssueRecords, ReporterOptions } from 'knip';

function keepTracked(records: IssueRecords, untrackedPaths: ReadonlySet<string>): IssueRecords {
  return Object.fromEntries(Object.entries(records).filter(([path]) => !untrackedPaths.has(path)));
}

function countIssues(records: IssueRecords): number {
  return Object.values(records).reduce(
    (sum, issuesOfFile) => sum + Object.keys(issuesOfFile).length,
    0,
  );
}

export function withoutUntrackedFiles(
  report: ReporterOptions,
  untrackedPaths: ReadonlySet<string>,
): ReporterOptions {
  const removedByType = new Map<string, number>();
  const keptIssues = Object.fromEntries(
    Object.entries(report.issues).map(([type, records]): [string, IssueRecords] => {
      const kept = keepTracked(records, untrackedPaths);
      removedByType.set(type, countIssues(records) - countIssues(kept));
      return [type, kept];
    }),
  );
  const keptCounters = Object.fromEntries(
    Object.entries(report.counters).map(([type, count]): [string, number] => [
      type,
      count - (removedByType.get(type) ?? 0),
    ]),
  );
  return {
    ...report,
    issues: { ...report.issues, ...keptIssues },
    counters: { ...report.counters, ...keptCounters },
  };
}
