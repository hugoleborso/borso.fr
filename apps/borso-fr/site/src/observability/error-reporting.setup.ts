import { selectErrorReportingSettings } from './error-reporting.core';
import { readErrorReportingInputs } from './error-reporting.environment';

const settings = selectErrorReportingSettings(readErrorReportingInputs());

if (settings !== undefined) {
  void import('./error-reporting.adapter').then(({ startErrorReporting }) => {
    startErrorReporting(settings);
  });
}
