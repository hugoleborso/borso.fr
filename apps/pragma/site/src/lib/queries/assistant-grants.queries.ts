/** @Feature auth */

import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InferRequestType, InferResponseType } from 'hono/client';
import { ApiError, api } from '../api.client';
import { leavePageFor } from '../page-location.adapter';

export const assistantGrantKeys = {
  all: ['assistant-grants'] as const,
  list: () => [...assistantGrantKeys.all, 'list'] as const,
  consent: (authorizationSearch: string) =>
    [...assistantGrantKeys.all, 'consent', authorizationSearch] as const,
};

export type AssistantGrantSummary = InferResponseType<
  (typeof api.api)['assistant-grants']['$get'],
  200
>['grants'][number];

export type AuthorizationQuery = InferRequestType<typeof api.api.oauth.consent.$get>['query'];

export type ConsentDecision = InferRequestType<
  typeof api.api.oauth.consent.$post
>['json']['decision'];

async function throwOnFailure(response: Response, label: string): Promise<void> {
  if (response.ok) return;
  const failureBody: unknown = await response.json().catch(() => null);
  throw new ApiError(response.status, `${label} ${String(response.status)}`, failureBody);
}

function withoutGrant(
  grants: readonly AssistantGrantSummary[],
  grantId: string,
): AssistantGrantSummary[] {
  return grants.filter((grant) => grant.id !== grantId);
}

function forgetRevokedGrant(queryClient: QueryClient, grantId: string): void {
  queryClient.setQueryData<AssistantGrantSummary[]>(assistantGrantKeys.list(), (grants) =>
    grants === undefined ? grants : withoutGrant(grants, grantId),
  );
}

// @FollowsBlueprint query-module
export function useAssistantGrants() {
  return useQuery({
    queryKey: assistantGrantKeys.list(),
    queryFn: async (): Promise<AssistantGrantSummary[]> => {
      const response = await api.api['assistant-grants'].$get();
      await throwOnFailure(response, 'assistant-grants');
      const body = await response.json();
      return 'grants' in body ? body.grants : [];
    },
  });
}

// @FollowsBlueprint query-pessimistic-mutation
export function useRevokeAssistantGrant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: { grantId: string }) => {
      const response = await api.api['assistant-grants'][':grantId'].$delete({
        param: { grantId: variables.grantId },
      });
      await throwOnFailure(response, 'assistant-grant-revoke');
      return variables.grantId;
    },
    onSuccess: (grantId) => forgetRevokedGrant(queryClient, grantId),
  });
}

export function useConsentDescription(query: AuthorizationQuery, authorizationSearch: string) {
  return useQuery({
    queryKey: assistantGrantKeys.consent(authorizationSearch),
    queryFn: async () => {
      const response = await api.api.oauth.consent.$get({ query });
      await throwOnFailure(response, 'consent');
      const body = await response.json();
      if (!('clientName' in body)) throw new ApiError(response.status, 'consent', body);
      return body;
    },
    retry: false,
  });
}

export function useDecideConsent() {
  return useMutation({
    mutationFn: async (variables: { query: AuthorizationQuery; decision: ConsentDecision }) => {
      const response = await api.api.oauth.consent.$post({
        json: { ...variables.query, decision: variables.decision },
      });
      await throwOnFailure(response, 'consent-decision');
      const body = await response.json();
      if (!('redirectTo' in body)) throw new ApiError(response.status, 'consent-decision', body);
      return body.redirectTo;
    },
    onSuccess: (redirectTo) => leavePageFor(redirectTo),
  });
}
