import { selectBrowserReportingSettings } from '@domain/error-reporting.core';
import { startErrorReporting } from './error-reporting.adapter';
import { readErrorReportingInputs } from './error-reporting.environment';

startErrorReporting(selectBrowserReportingSettings(readErrorReportingInputs()));
