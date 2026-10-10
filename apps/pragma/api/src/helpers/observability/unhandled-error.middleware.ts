import type { Context, ErrorHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { reportUnhandledError } from './error-reporting.adapter';

const INTERNAL_SERVER_ERROR_STATUS = 500;
const INTERNAL_SERVER_ERROR_BODY = 'Internal Server Error';

type ReportFailure = (error: unknown) => Promise<void>;

export function buildUnhandledErrorAnswer(reportFailure: ReportFailure): ErrorHandler {
  return async (error: Error, context: Context): Promise<Response> => {
    if (error instanceof HTTPException) {
      const refusal = error.getResponse();
      return context.newResponse(refusal.body, refusal);
    }
    console.error(error);
    await reportFailure(error);
    return context.text(INTERNAL_SERVER_ERROR_BODY, INTERNAL_SERVER_ERROR_STATUS);
  };
}

export const answerUnhandledError = buildUnhandledErrorAnswer(reportUnhandledError);
