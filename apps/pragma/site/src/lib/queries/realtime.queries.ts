/** @Feature live-invalidation */

import { api } from '../api.client';
import type { RealtimeTicketGrant } from '../live-invalidation.core';

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
