import { startErrorReporting } from './error-reporting.adapter';
import { selectErrorReportingSettings } from './error-reporting.core';
import { readErrorReportingInputs } from './error-reporting.environment';

startErrorReporting(selectErrorReportingSettings(readErrorReportingInputs()));
