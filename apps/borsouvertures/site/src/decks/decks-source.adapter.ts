import type { DecksDocumentFetch } from './decks-load.utils';

const UNREACHABLE: DecksDocumentFetch = { status: 'unreachable' };
const ARRIVED_AS_NO_JSON: DecksDocumentFetch = { status: 'arrived', body: null };

// @FollowsBlueprint adapter-external-service
export async function fetchDecksDocument(url: string): Promise<DecksDocumentFetch> {
  try {
    const response = await fetch(url, { cache: 'no-cache' });
    if (!response.ok) return { status: 'refused', httpStatus: response.status };
    return { status: 'arrived', body: await response.json() };
  } catch (error) {
    return error instanceof SyntaxError ? ARRIVED_AS_NO_JSON : UNREACHABLE;
  }
}
