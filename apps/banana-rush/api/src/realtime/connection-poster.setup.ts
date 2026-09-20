import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} from '@aws-sdk/client-apigatewaymanagementapi';
import type { ConnectionPoster } from './broadcast.adapter';

const CALLBACK_URL_VARIABLE = 'WEBSOCKET_CALLBACK_URL';

interface PosterHolder {
  chosen: ConnectionPoster | null;
  fromEnvironment: ConnectionPoster | null;
}

const holder: PosterHolder = { chosen: null, fromEnvironment: null };

export function useConnectionPoster(poster: ConnectionPoster): void {
  holder.chosen = poster;
}

function buildAwsPoster(endpoint: string): ConnectionPoster {
  const client = new ApiGatewayManagementApiClient({ endpoint });
  return {
    postToConnection: async (input) => await client.send(new PostToConnectionCommand(input)),
  };
}

/**
 * @Blueprint adapter-chosen-by-the-composition-root
 * @BlueprintName Adapter Chosen By The Composition Root
 * @BlueprintUsage Use where the same outbound call has one implementation in the cloud and another on a laptop, and no caller should know which.
 * @BlueprintDescription Lets the entry point install an implementation and falls back to the vendor one built from the environment, so a service calls the same function in both worlds and holds no branch about where it is running. The two slots live on one record rather than as two module level bindings, which keeps the assignment a property write and leaves the module's own bindings constant. Answering `null` when neither exists is deliberate: an application started with no channel configured should still serve every request, and the caller skips the delivery rather than failing the write that triggered it.
 */
export function resolveConnectionPoster(): ConnectionPoster | null {
  if (holder.chosen !== null) return holder.chosen;
  const endpoint = process.env[CALLBACK_URL_VARIABLE];
  if (endpoint === undefined || endpoint.length === 0) return null;
  holder.fromEnvironment ??= buildAwsPoster(endpoint);
  return holder.fromEnvironment;
}
