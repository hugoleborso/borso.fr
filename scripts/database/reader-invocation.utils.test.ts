import { describe, expect, it } from 'vitest';
import { formatRows, readInvocationOutcome } from './reader-invocation.utils';

const NO_FUNCTION_ERROR = undefined;

describe('readInvocationOutcome', () => {
  it('reads rows, the schema and the role out of a successful answer', () => {
    const outcome = readInvocationOutcome(
      JSON.stringify({
        rows: [{ count: 3 }],
        rowCount: 1,
        capped: false,
        schema: 'prod',
        role: 'ai_reader_prod',
      }),
      NO_FUNCTION_ERROR,
    );
    expect(outcome).toStrictEqual({
      kind: 'rows',
      rows: [{ count: 3 }],
      capped: false,
      schema: 'prod',
      role: 'ai_reader_prod',
    });
  });

  it('carries the capped flag through', () => {
    const outcome = readInvocationOutcome(
      JSON.stringify({ rows: [], capped: true, schema: 'prod', role: 'ai_reader_prod' }),
      NO_FUNCTION_ERROR,
    );
    expect(outcome).toMatchObject({ kind: 'rows', capped: true });
  });

  it('treats a missing capped flag as not capped', () => {
    const outcome = readInvocationOutcome(
      JSON.stringify({ rows: [], schema: 'prod', role: 'ai_reader_prod' }),
      NO_FUNCTION_ERROR,
    );
    expect(outcome).toMatchObject({ kind: 'rows', capped: false });
  });

  it('reports a refusal the function returned, verbatim', () => {
    const outcome = readInvocationOutcome(
      JSON.stringify({ refused: 'the query names member_credential' }),
      NO_FUNCTION_ERROR,
    );
    expect(outcome).toStrictEqual({
      kind: 'refused',
      reason: 'the query names member_credential',
    });
  });

  it('names the error type and message when the function threw', () => {
    const outcome = readInvocationOutcome(
      JSON.stringify({ errorType: 'TypeError', errorMessage: 'DSQL_SCHEMA is not set' }),
      'Unhandled',
    );
    expect(outcome).toStrictEqual({
      kind: 'failed',
      reason: 'the reader function failed with TypeError: DSQL_SCHEMA is not set',
    });
  });

  it('falls back to generic wording when the failure payload names neither', () => {
    expect(readInvocationOutcome(JSON.stringify({}), 'Unhandled')).toStrictEqual({
      kind: 'failed',
      reason: 'the reader function failed with Error: no message given',
    });
  });

  it('falls back again when the failure payload is not an object at all', () => {
    expect(readInvocationOutcome('"boom"', 'Unhandled')).toStrictEqual({
      kind: 'failed',
      reason: 'the reader function failed and returned no error payload.',
    });
  });

  it('ignores an empty FunctionError, which the CLI omits on success', () => {
    const outcome = readInvocationOutcome(
      JSON.stringify({ rows: [], schema: 'prod', role: 'ai_reader_prod' }),
      '',
    );
    expect(outcome).toMatchObject({ kind: 'rows' });
  });

  it('falls back when the failure payload names a non-string error type', () => {
    expect(readInvocationOutcome(JSON.stringify({ errorType: 7 }), 'Unhandled')).toStrictEqual({
      kind: 'failed',
      reason: 'the reader function failed with Error: no message given',
    });
  });

  it('treats a null payload as no result, rather than reading fields off it', () => {
    expect(readInvocationOutcome('null', NO_FUNCTION_ERROR)).toStrictEqual({
      kind: 'failed',
      reason: 'the reader function returned null, not a result.',
    });
  });

  it('treats a null failure payload as naming no error', () => {
    expect(readInvocationOutcome('null', 'Unhandled')).toStrictEqual({
      kind: 'failed',
      reason: 'the reader function failed and returned no error payload.',
    });
  });

  it('fails when rows is present but is not an array', () => {
    expect(
      readInvocationOutcome(
        JSON.stringify({ rows: 'one row', schema: 'prod', role: 'ai_reader_prod' }),
        NO_FUNCTION_ERROR,
      ),
    ).toMatchObject({ kind: 'failed' });
  });

  it('fails when the schema is missing from an otherwise shaped answer', () => {
    expect(
      readInvocationOutcome(
        JSON.stringify({ rows: [], role: 'ai_reader_prod' }),
        NO_FUNCTION_ERROR,
      ),
    ).toMatchObject({ kind: 'failed' });
  });

  it('fails when the payload is not JSON', () => {
    expect(readInvocationOutcome('<html>502</html>', NO_FUNCTION_ERROR)).toStrictEqual({
      kind: 'failed',
      reason: 'the reader function returned no JSON: <html>502</html>',
    });
  });

  it('fails when the payload is JSON but not a result object', () => {
    expect(readInvocationOutcome('[1,2]', NO_FUNCTION_ERROR)).toStrictEqual({
      kind: 'failed',
      reason: 'the reader function returned [1,2], not a result.',
    });
  });

  it('fails when rows are missing, rather than printing nothing as success', () => {
    expect(
      readInvocationOutcome(JSON.stringify({ schema: 'prod' }), NO_FUNCTION_ERROR),
    ).toStrictEqual({
      kind: 'failed',
      reason: 'the reader function returned a result with no rows: {"schema":"prod"}',
    });
  });

  it('fails when the role is missing from an otherwise shaped answer', () => {
    expect(
      readInvocationOutcome(JSON.stringify({ rows: [], schema: 'prod' }), NO_FUNCTION_ERROR),
    ).toMatchObject({ kind: 'failed' });
  });
});

describe('formatRows', () => {
  it('writes one JSON object per row', () => {
    expect(formatRows([{ a: 1 }, { a: 2 }])).toStrictEqual(['{"a":1}', '{"a":2}']);
  });

  it('is empty for no rows', () => {
    expect(formatRows([])).toStrictEqual([]);
  });
});
