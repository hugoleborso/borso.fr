import { loadOpenings } from './loadOpenings';
import { type OpeningsLoad, selectOpeningsLoad } from './openingsLoad.utils';

/**
 * The openings dataset as a promise a component reads with React's `use`,
 * which is what lets a Suspense boundary own the loading state instead of a
 * `useEffect` writing into `useState`.
 *
 * The promise is created on first read and then reused, because `use` needs
 * the same promise on every render for the suspended tree to resume.
 */
const openingsRequest: { pending: Promise<OpeningsLoad> | undefined } = { pending: undefined };

export function readOpeningsRequest(): Promise<OpeningsLoad> {
  openingsRequest.pending ??= loadOpenings().then(selectOpeningsLoad);
  return openingsRequest.pending;
}
