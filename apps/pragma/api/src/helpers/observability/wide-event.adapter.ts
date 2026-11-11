import { AsyncLocalStorage } from 'node:async_hooks';
import { recordAttributesOnActiveSpan } from './error-reporting.adapter';
import { readErrorReportingInputs } from './error-reporting.environment';
import {
  buildDetachedFields,
  buildFailureFields,
  buildOpeningFields,
  buildReturnedFields,
  mergeWideEventFields,
  type OptionalWideEventFields,
  type ServiceIdentity,
  selectRequestId,
  serializeWideEvent,
  type WideEventFields,
} from './wide-event.core';

export type { WideEventFields, WideEventValue } from './wide-event.core';

interface WideEventScope {
  fields: WideEventFields;
  isEmitted: boolean;
}

const openScopes = new AsyncLocalStorage<WideEventScope>();

let isColdStart = true;

function readServiceIdentity(): ServiceIdentity {
  const inputs = readErrorReportingInputs();
  return { stage: inputs.stage, version: inputs.release };
}

function emitWideEvent(fields: WideEventFields): void {
  process.stdout.write(serializeWideEvent(fields));
  recordAttributesOnActiveSpan(fields);
}

// @FollowsBlueprint adapter-external-service
export async function runInWideEvent<Answer>(
  baseFields: OptionalWideEventFields,
  work: () => Promise<Answer>,
): Promise<Answer> {
  const parentRequestId = selectRequestId(openScopes.getStore()?.fields ?? {});
  const isFirstEventOfInstance = isColdStart;
  isColdStart = false;
  const scope: WideEventScope = {
    fields: buildOpeningFields(
      { service: readServiceIdentity(), isColdStart: isFirstEventOfInstance, parentRequestId },
      baseFields,
    ),
    isEmitted: false,
  };
  let endingFields: WideEventFields = {};
  try {
    const answer = await openScopes.run(scope, work);
    endingFields = buildReturnedFields(scope.fields);
    return answer;
  } catch (error) {
    endingFields = buildFailureFields(error);
    throw error;
  } finally {
    scope.fields = mergeWideEventFields(scope.fields, endingFields);
    scope.isEmitted = true;
    emitWideEvent(scope.fields);
  }
}

function findOpenScope(): WideEventScope | undefined {
  const scope = openScopes.getStore();
  return scope?.isEmitted === false ? scope : undefined;
}

export function addWideEventFields(fields: WideEventFields): void {
  const openScope = findOpenScope();
  if (openScope !== undefined) {
    openScope.fields = mergeWideEventFields(openScope.fields, fields);
    return;
  }
  const requestId = selectRequestId(openScopes.getStore()?.fields ?? {});
  process.stdout.write(
    serializeWideEvent(buildDetachedFields(readServiceIdentity(), requestId, fields)),
  );
}

export function addFieldsToOpenWideEvent(fields: WideEventFields): void {
  const openScope = findOpenScope();
  if (openScope === undefined) return;
  openScope.fields = mergeWideEventFields(openScope.fields, fields);
}
