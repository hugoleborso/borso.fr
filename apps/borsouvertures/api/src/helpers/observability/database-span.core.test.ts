import { describe, expect, it } from 'vitest';
import { redactDatabaseSpan, type SentSpan } from './database-span.core';

function sentSpan(name: string, attributes: SentSpan['attributes']): SentSpan {
  return {
    trace_id: '0123456789abcdef0123456789abcdef',
    span_id: '0123456789abcdef',
    name,
    start_timestamp: 1,
    end_timestamp: 2,
    status: 'ok',
    is_segment: false,
    attributes,
  };
}

const QUERY_SPAN_ATTRIBUTES = {
  'sentry.origin': 'auto.db.postgresjs',
  'sentry.op': 'db',
  'db.system.name': 'postgres',
  'db.query.text': 'select iban from secret_members where email = $1',
  'db.query.summary': 'select secret_members',
  'db.operation.name': 'SELECT',
  'server.port': 5432,
};

describe('redactDatabaseSpan', () => {
  it('names a database span by its statement kind and drops the statement and its tables', () => {
    expect(
      redactDatabaseSpan(sentSpan('select secret_members', QUERY_SPAN_ATTRIBUTES)),
    ).toStrictEqual(
      sentSpan('SELECT', {
        'sentry.origin': 'auto.db.postgresjs',
        'sentry.op': 'db',
        'db.system.name': 'postgres',
        'db.operation.name': 'SELECT',
        'server.port': 5432,
      }),
    );
  });

  it('leaves the span it was given untouched', () => {
    const span = sentSpan('select secret_members', QUERY_SPAN_ATTRIBUTES);

    redactDatabaseSpan(span);

    expect(span).toStrictEqual(sentSpan('select secret_members', QUERY_SPAN_ATTRIBUTES));
  });

  it('names a database span with no statement kind after the operation alone', () => {
    expect(
      redactDatabaseSpan(
        sentSpan('select secret_members', { 'sentry.op': 'db', 'db.query.text': 'select 1' }),
      ),
    ).toStrictEqual(sentSpan('db', { 'sentry.op': 'db' }));
  });

  it('recognises a database span by its origin when the operation is missing', () => {
    expect(
      redactDatabaseSpan(
        sentSpan('select secret_members', {
          'sentry.origin': 'auto.db.postgresjs',
          'db.query.text': 'select 1',
          'db.operation.name': 'SELECT',
        }),
      ),
    ).toStrictEqual(
      sentSpan('SELECT', { 'sentry.origin': 'auto.db.postgresjs', 'db.operation.name': 'SELECT' }),
    );
  });

  it.each([
    ['a request span', { 'sentry.op': 'http.server', 'sentry.origin': 'manual' }],
    ['a span with no operation or origin', {}],
    [
      'a span whose origin only contains the database category',
      { 'sentry.origin': 'manual.auto.db.x' },
    ],
    ['a span whose origin is not text', { 'sentry.origin': 1 }],
  ])('sends %s as it is', (_label, attributes) => {
    const span = sentSpan('GET /api/health', { ...attributes, 'db.query.text': 'kept' });

    expect(redactDatabaseSpan(span)).toBe(span);
  });
});
