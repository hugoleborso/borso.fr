import { startErrorReporting } from './error-reporting.adapter';
import { selectBrowserReportingSettings } from './error-reporting.core';
import { readErrorReportingInputs } from './error-reporting.environment';

startErrorReporting(selectBrowserReportingSettings(readErrorReportingInputs()));
