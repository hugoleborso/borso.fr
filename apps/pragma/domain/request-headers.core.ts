// @FollowsBlueprint core-lookup-table
export const PRAGMA_REQUEST_HEADERS = {
  ballotToken: 'x-ballot-token',
  realtimeClient: 'x-pragma-client',
} as const;

export type PragmaRequestHeader =
  (typeof PRAGMA_REQUEST_HEADERS)[keyof typeof PRAGMA_REQUEST_HEADERS];

export const PRAGMA_REQUEST_HEADER_NAMES: readonly PragmaRequestHeader[] =
  Object.values(PRAGMA_REQUEST_HEADERS);
