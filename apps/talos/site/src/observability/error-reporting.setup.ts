import { selectErrorReportingSettings } from '@domain/error-reporting.core';
import { startErrorReporting } from './error-reporting.adapter';
import { readErrorReportingDsn } from './error-reporting.environment';

startErrorReporting(selectErrorReportingSettings(readErrorReportingDsn()));
