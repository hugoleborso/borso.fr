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

export function useConnectionPoster(poster: ConnectionPoster | null): void {
  holder.chosen = poster;
}

function buildAwsPoster(endpoint: string): ConnectionPoster {
  const client = new ApiGatewayManagementApiClient({ endpoint });
  return {
    postToConnection: async (input) => await client.send(new PostToConnectionCommand(input)),
  };
}

// @FollowsBlueprint adapter-chosen-by-the-composition-root
export function resolveConnectionPoster(): ConnectionPoster | null {
  if (holder.chosen !== null) return holder.chosen;
  const endpoint = process.env[CALLBACK_URL_VARIABLE];
  if (endpoint === undefined || endpoint.length === 0) return null;
  holder.fromEnvironment ??= buildAwsPoster(endpoint);
  return holder.fromEnvironment;
}
