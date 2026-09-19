const WEBSOCKET_CLIENT_URL_VARIABLE = 'WEBSOCKET_CLIENT_URL';

export interface PublicConfig {
  readonly websocketUrl: string | null;
}

/**
 * @Blueprint environment-address-the-browser-cannot-know-at-build-time
 * @BlueprintName Environment Address The Browser Cannot Know At Build Time
 * @BlueprintUsage Use for an address that only exists once the infrastructure is deployed, which the single page application still has to reach.
 * @BlueprintDescription Answers the address from the running process rather than from a variable baked into the bundle, because the bundle is built before the stack that owns the address exists. An absent variable is answered as `null` rather than as a failure, so a developer running the API on a laptop gets a working application that simply has no channel to listen on, and the front end decides what to do about it. Reading it here rather than in the controller keeps the environment out of the route and leaves one place to change when a second address joins it.
 */
export function readPublicConfig(): PublicConfig {
  const websocketUrl = process.env[WEBSOCKET_CLIENT_URL_VARIABLE];
  return {
    websocketUrl: websocketUrl === undefined || websocketUrl.length === 0 ? null : websocketUrl,
  };
}
