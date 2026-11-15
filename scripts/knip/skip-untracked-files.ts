import { execFileSync } from 'node:child_process';
import type { ReporterOptions } from 'knip';
import { withoutUntrackedFiles } from './untracked-files.core';

export default function skipUntrackedFiles(report: ReporterOptions): ReporterOptions {
  const untrackedPaths = execFileSync('git', ['ls-files', '--others', '--exclude-standard', '-z'], {
    cwd: report.cwd,
    encoding: 'utf8',
  })
    .split('\0')
    .filter((path) => path.length > 0);
  if (untrackedPaths.length > 0) {
    process.stderr.write(
      `[knip] skipping ${String(untrackedPaths.length)} untracked file(s), which this push does not carry\n`,
    );
  }
  return withoutUntrackedFiles(report, new Set(untrackedPaths));
}
