import { selectErrorReportingSettings } from '@domain/error-reporting.core';
import { startErrorReporting } from './error-reporting.adapter';
import { readErrorReportingInputs } from './error-reporting.environment';

startErrorReporting(selectErrorReportingSettings(readErrorReportingInputs()));
