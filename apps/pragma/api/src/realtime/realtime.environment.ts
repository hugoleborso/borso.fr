const WEBSOCKET_CLIENT_URL_VARIABLE = 'WEBSOCKET_CLIENT_URL';

// @FollowsBlueprint environment-address-the-browser-cannot-know-at-build-time
export function readRealtimeClientUrl(): string | null {
  const clientUrl = process.env[WEBSOCKET_CLIENT_URL_VARIABLE];
  return clientUrl === undefined || clientUrl.length === 0 ? null : clientUrl;
}
