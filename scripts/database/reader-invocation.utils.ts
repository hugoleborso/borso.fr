export type InvocationOutcome =
  | {
      readonly kind: 'rows';
      readonly rows: readonly unknown[];
      readonly capped: boolean;
      readonly schema: string;
      readonly role: string;
    }
  | { readonly kind: 'refused'; readonly reason: string }
  | { readonly kind: 'failed'; readonly reason: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function describeFunctionError(payload: unknown): string {
  if (!isRecord(payload)) return 'the reader function failed and returned no error payload.';
  const type = typeof payload.errorType === 'string' ? payload.errorType : 'Error';
  const message =
    typeof payload.errorMessage === 'string' ? payload.errorMessage : 'no message given';
  return `the reader function failed with ${type}: ${message}`;
}

export function readInvocationOutcome(
  rawPayload: string,
  functionError: string | undefined,
): InvocationOutcome {
  let payload: unknown;
  try {
    payload = JSON.parse(rawPayload);
  } catch {
    return { kind: 'failed', reason: `the reader function returned no JSON: ${rawPayload}` };
  }
  if (functionError !== undefined && functionError !== '') {
    return { kind: 'failed', reason: describeFunctionError(payload) };
  }
  if (!isRecord(payload)) {
    return { kind: 'failed', reason: `the reader function returned ${rawPayload}, not a result.` };
  }
  if (typeof payload.refused === 'string') {
    return { kind: 'refused', reason: payload.refused };
  }
  if (
    !Array.isArray(payload.rows) ||
    typeof payload.schema !== 'string' ||
    typeof payload.role !== 'string'
  ) {
    return {
      kind: 'failed',
      reason: `the reader function returned a result with no rows: ${rawPayload}`,
    };
  }
  return {
    kind: 'rows',
    rows: payload.rows,
    capped: payload.capped === true,
    schema: payload.schema,
    role: payload.role,
  };
}

export function formatRows(rows: readonly unknown[]): string[] {
  return rows.map((row) => JSON.stringify(row));
}
