import { loadOpenings } from './loadOpenings';
import { type OpeningsLoad, selectOpeningsLoad } from './openingsLoad.utils';

const openingsRequest: { pending: Promise<OpeningsLoad> | undefined } = { pending: undefined };

/**
 * @Blueprint route-suspense-resource
 * @BlueprintName Suspense Resource Module
 * @BlueprintUsage Use for data a route needs once per page load, where TanStack Query would be more machinery than the read is worth.
 * @BlueprintDescription Memoises the promise in a module level holder and returns the same one on every call, which is what React's `use` needs for a suspended tree to resume rather than restart the fetch on each render attempt. The promise is created on first read rather than at import time, so importing the module starts no network work, and the `??=` assignment is the whole cache. Callers read it with `use` inside a Suspense boundary, so the loading state belongs to the boundary and no effect writes a fetch result into state.
 */
export function readOpeningsRequest(): Promise<OpeningsLoad> {
  openingsRequest.pending ??= loadOpenings().then(selectOpeningsLoad);
  return openingsRequest.pending;
}
