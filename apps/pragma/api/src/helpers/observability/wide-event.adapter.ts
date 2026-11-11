import { AsyncLocalStorage } from 'node:async_hooks';
import { recordAttributesOnActiveSpan } from './error-reporting.adapter';
import { readErrorReportingInputs } from './error-reporting.environment';
import {
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
    emitWideEvent(scope.fields);
  }
}

export function addWideEventFields(fields: WideEventFields): void {
  const scope = openScopes.getStore();
  if (scope === undefined) return;
  scope.fields = mergeWideEventFields(scope.fields, fields);
}
