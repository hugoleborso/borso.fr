export type WideEventValue = string | number | boolean | readonly string[];
export type WideEventFields = Readonly<Record<string, WideEventValue>>;
export type OptionalWideEventFields = Readonly<Record<string, WideEventValue | undefined>>;

export type RequestOutcome = 'success' | 'refused' | 'failed';

export interface ServiceIdentity {
  readonly stage: string | undefined;
  readonly version: string | undefined;
}

export interface OpeningFacts {
  readonly service: ServiceIdentity;
  readonly isColdStart: boolean;
}

export interface HttpRequestEnding {
  readonly route: string;
  readonly status: number;
  readonly durationMilliseconds: number;
  readonly failure: unknown;
}

export interface ThrownValueDescription {
  readonly type: string;
  readonly message: string;
  readonly stack: string | undefined;
}

const SERVICE_NAME = 'banana-rush-api';
const FIRST_REFUSED_STATUS = 400;
const FIRST_FAILED_STATUS = 500;
const NON_ERROR_TYPE = 'NonErrorThrown';
const OUTCOME_FIELD = 'outcome';

function isPresent(
  entry: readonly [string, WideEventValue | undefined],
): entry is [string, WideEventValue] {
  return entry[1] !== undefined;
}

function dropAbsentValues(fields: OptionalWideEventFields): WideEventFields {
  return Object.fromEntries(Object.entries(fields).filter(isPresent));
}

function isStringList(value: WideEventValue | undefined): value is readonly string[] {
  return Array.isArray(value);
}

// @FollowsBlueprint core-decision
export function selectRequestOutcome(status: number): RequestOutcome {
  if (status >= FIRST_FAILED_STATUS) return 'failed';
  if (status >= FIRST_REFUSED_STATUS) return 'refused';
  return 'success';
}

export function describeThrownValue(thrown: unknown): ThrownValueDescription {
  if (thrown instanceof Error) {
    return { type: thrown.name, message: thrown.message, stack: thrown.stack };
  }
  return { type: NON_ERROR_TYPE, message: String(thrown), stack: undefined };
}

export function buildFailureFields(thrown: unknown): WideEventFields {
  const description = describeThrownValue(thrown);
  return dropAbsentValues({
    [OUTCOME_FIELD]: 'failed',
    'error.type': description.type,
    'error.message': description.message,
    'error.stack': description.stack,
  });
}

export function buildServiceFields(service: ServiceIdentity): WideEventFields {
  return dropAbsentValues({
    'service.name': SERVICE_NAME,
    'service.stage': service.stage,
    'service.version': service.version,
  });
}

export function buildOpeningFields(
  facts: OpeningFacts,
  baseFields: OptionalWideEventFields,
): WideEventFields {
  return dropAbsentValues({
    ...buildServiceFields(facts.service),
    'lambda.cold_start': facts.isColdStart,
    ...baseFields,
  });
}

export function buildHttpEndingFields(ending: HttpRequestEnding): WideEventFields {
  const outcome = selectRequestOutcome(ending.status);
  const failureFields =
    outcome === 'failed' && ending.failure !== undefined ? buildFailureFields(ending.failure) : {};
  return {
    'http.route': ending.route,
    'http.response.status_code': ending.status,
    duration_ms: ending.durationMilliseconds,
    ...failureFields,
    [OUTCOME_FIELD]: outcome,
  };
}

export function buildReturnedFields(fields: WideEventFields): WideEventFields {
  if (fields[OUTCOME_FIELD] !== undefined) return {};
  return { [OUTCOME_FIELD]: 'success' };
}

export function mergeWideEventFields(
  current: WideEventFields,
  added: WideEventFields,
): WideEventFields {
  const merged: Record<string, WideEventValue> = { ...current };
  for (const [key, value] of Object.entries(added)) {
    const held = current[key];
    merged[key] = isStringList(held) && isStringList(value) ? [...held, ...value] : value;
  }
  return merged;
}

export function serializeWideEvent(fields: WideEventFields): string {
  return `${JSON.stringify(fields)}\n`;
}

function hasProperty<Key extends string>(
  value: unknown,
  key: Key,
): value is Readonly<Record<Key, unknown>> {
  return typeof value === 'object' && value !== null && key in value;
}

export function selectLambdaRequestId(environment: unknown): string | undefined {
  if (!hasProperty(environment, 'lambdaContext')) return undefined;
  const { lambdaContext } = environment;
  if (!hasProperty(lambdaContext, 'awsRequestId')) return undefined;
  const { awsRequestId } = lambdaContext;
  return typeof awsRequestId === 'string' ? awsRequestId : undefined;
}
