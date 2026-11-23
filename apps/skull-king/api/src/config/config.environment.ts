const WEBSOCKET_CLIENT_URL_VARIABLE = 'WEBSOCKET_CLIENT_URL';

export interface PublicConfig {
  readonly websocketUrl: string | null;
}

// @FollowsBlueprint environment-address-the-browser-cannot-know-at-build-time
export function readPublicConfig(): PublicConfig {
  const websocketUrl = process.env[WEBSOCKET_CLIENT_URL_VARIABLE];
  return {
    websocketUrl: websocketUrl === undefined || websocketUrl.length === 0 ? null : websocketUrl,
  };
}
