/** @Feature live-invalidation */

import type { InferResponseType } from 'hono/client';
import { api } from '../api.client';

export type RealtimeTicketGrant = InferResponseType<typeof api.api.realtime.ticket.$get, 200>;

// @FollowsBlueprint query-module
export async function requestRealtimeTicket(): Promise<RealtimeTicketGrant | null> {
  try {
    const response = await api.api.realtime.ticket.$get();
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}
