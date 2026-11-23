import type { init } from '@sentry/aws-serverless';

type ReportingOptions = NonNullable<Parameters<typeof init>[0]>;

export type SentSpan = Parameters<NonNullable<ReportingOptions['beforeSendSpan']>>[0];

const DATABASE_OPERATION = 'db';

const DATABASE_ORIGIN_PREFIX = 'auto.db.';

const OPERATION_ATTRIBUTE = 'sentry.op';

const ORIGIN_ATTRIBUTE = 'sentry.origin';

const STATEMENT_KIND_ATTRIBUTE = 'db.operation.name';

const STATEMENT_ATTRIBUTES: ReadonlySet<string> = new Set(['db.query.text', 'db.query.summary']);

function isDatabaseSpan(attributes: SentSpan['attributes']): boolean {
  const origin = attributes[ORIGIN_ATTRIBUTE];
  return (
    attributes[OPERATION_ATTRIBUTE] === DATABASE_OPERATION ||
    (typeof origin === 'string' && origin.startsWith(DATABASE_ORIGIN_PREFIX))
  );
}

// @FollowsBlueprint core-decision
export function redactDatabaseSpan(span: SentSpan): SentSpan {
  if (!isDatabaseSpan(span.attributes)) return span;
  const statementKind = span.attributes[STATEMENT_KIND_ATTRIBUTE];
  return {
    ...span,
    name: typeof statementKind === 'string' ? statementKind : DATABASE_OPERATION,
    attributes: Object.fromEntries(
      Object.entries(span.attributes).filter(([key]) => !STATEMENT_ATTRIBUTES.has(key)),
    ),
  };
}
