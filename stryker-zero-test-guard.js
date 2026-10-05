export const ZERO_TEST_GUARD_REPORTER = 'zero-test-guard';

const SURVIVED = 'Survived';

const FAILURE_EXIT_CODE = 1;

function isCoveredMutantThatRanNoTests(mutant) {
  const coveringTestCount = mutant.coveredBy?.length ?? 0;
  return mutant.status === SURVIVED && coveringTestCount > 0 && mutant.testsCompleted === 0;
}

function selectCoveredMutantsThatRanNoTests(files) {
  return Object.entries(files).flatMap(([fileName, { mutants }]) =>
    mutants
      .filter(isCoveredMutantThatRanNoTests)
      .map((mutant) => `${fileName}:${mutant.location.start.line} ${mutant.mutatorName}`),
  );
}

class ZeroTestGuardReporter {
  static inject = ['logger'];

  constructor(logger) {
    this.logger = logger;
  }

  onMutationTestReportReady(report) {
    const offenders = selectCoveredMutantsThatRanNoTests(report.files);
    if (offenders.length === 0) return;
    this.logger.error(
      [
        `${offenders.length} mutant(s) have covering tests but their run executed none, so "Survived" is the test runner failing to select tests, not a weak test.`,
        'The score above is not a measurement. See docs/dantotsus/vitest-5-ran-no-test-against-any-mutant.md.',
        ...offenders.slice(0, 10).map((offender) => `  ${offender}`),
      ].join('\n'),
    );
    process.exitCode = FAILURE_EXIT_CODE;
  }
}

export const strykerPlugins = [
  { kind: 'Reporter', name: ZERO_TEST_GUARD_REPORTER, injectableClass: ZeroTestGuardReporter },
];
