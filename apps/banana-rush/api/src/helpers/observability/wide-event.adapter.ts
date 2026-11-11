import { AsyncLocalStorage } from 'node:async_hooks';
import {
  buildDetachedFields,
  buildFailureFields,
  buildOpeningFields,
  buildReturnedFields,
  mergeWideEventFields,
  type OptionalWideEventFields,
  selectRequestId,
  serializeWideEvent,
  type WideEventFields,
} from './wide-event.core';
import { readServiceStage } from './wide-event.environment';

export type { WideEventFields, WideEventValue } from './wide-event.core';

interface WideEventScope {
  fields: WideEventFields;
  isEmitted: boolean;
}

const openScopes = new AsyncLocalStorage<WideEventScope>();

let isColdStart = true;

function emitWideEvent(fields: WideEventFields): void {
  process.stdout.write(serializeWideEvent(fields));
}

// @FollowsBlueprint adapter-external-service
export async function runInWideEvent<Answer>(
  baseFields: OptionalWideEventFields,
  work: () => Promise<Answer>,
): Promise<Answer> {
  const isFirstEventOfInstance = isColdStart;
  isColdStart = false;
  const scope: WideEventScope = {
    fields: buildOpeningFields(
      { stage: readServiceStage(), isColdStart: isFirstEventOfInstance },
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

function findOpenScope(): WideEventScope | null {
  const scope = openScopes.getStore();
  return scope?.isEmitted === false ? scope : null;
}

export function addWideEventFields(fields: WideEventFields): void {
  const openScope = findOpenScope();
  if (openScope !== null) {
    openScope.fields = mergeWideEventFields(openScope.fields, fields);
    return;
  }
  const requestId = selectRequestId(openScopes.getStore()?.fields ?? {});
  process.stdout.write(
    serializeWideEvent(buildDetachedFields(readServiceStage(), requestId, fields)),
  );
}
