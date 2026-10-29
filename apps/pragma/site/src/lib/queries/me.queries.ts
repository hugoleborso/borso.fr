/** @Feature auth */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InferResponseType } from 'hono/client';
import { z } from 'zod';
import { ApiError, api } from '../api.client';
import { startPasskeyEnrolment } from '../passkey.adapter';
import { freeSlotsKeys } from './free-slots.queries';

export const meKeys = {
  all: ['me'] as const,
  profile: () => [...meKeys.all, 'profile'] as const,
  passkeys: () => [...meKeys.all, 'passkeys'] as const,
};

type MeResponse = InferResponseType<typeof api.api.me.$get>;
type PasskeysResponse = InferResponseType<typeof api.api.me.passkeys.$get>;

export type SignedInMember = Extract<MeResponse, { memberId: string }>;
export type PasskeySummary = Extract<PasskeysResponse, { passkeys: unknown }>['passkeys'][number];

const returnedPasskeySchema = z.object({
  passkey: z.object({ id: z.string(), label: z.string(), createdAt: z.string() }),
});

function readReturnedPasskey(body: unknown): PasskeySummary {
  const returned = returnedPasskeySchema.safeParse(body);
  if (!returned.success) throw new ApiError(0, 'passkey-response', body);
  return returned.data.passkey;
}

function withoutPasskey(passkeys: readonly PasskeySummary[], passkeyId: string): PasskeySummary[] {
  return passkeys.filter((passkey) => passkey.id !== passkeyId);
}

async function throwOnFailure(response: Response, label: string) {
  if (response.ok) return;
  const failureBody: unknown = await response.json().catch(() => null);
  throw new ApiError(response.status, `${label} ${String(response.status)}`, failureBody);
}

// @FollowsBlueprint query-module
export function useSignedInMember() {
  return useQuery({
    queryKey: meKeys.profile(),
    queryFn: async (): Promise<SignedInMember | null> => {
      const response = await api.api.me.$get();
      if (!response.ok) return null;
      const body = await response.json();
      return 'memberId' in body ? body : null;
    },
  });
}

export function usePasskeys() {
  return useQuery({
    queryKey: meKeys.passkeys(),
    queryFn: async (): Promise<PasskeySummary[]> => {
      const response = await api.api.me.passkeys.$get();
      if (!response.ok) return [];
      const body = await response.json();
      return 'passkeys' in body ? body.passkeys : [];
    },
  });
}

export function useSaveContactDetails() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: { phone: string | null; email: string | null }) => {
      const response = await api.api.me.contact.$put({ json: variables });
      await throwOnFailure(response, 'contact');
      return await response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: meKeys.profile() });
    },
  });
}

export type CalendarFeedSummary = SignedInMember['calendarFeeds'][number];

function withCalendarFeeds(
  member: SignedInMember | null | undefined,
  calendarFeeds: readonly CalendarFeedSummary[],
): SignedInMember | null | undefined {
  return member === null || member === undefined ? member : { ...member, calendarFeeds };
}

// @FollowsBlueprint query-settled-from-the-write-response
export function useAddCalendarFeed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: { address: string }) => {
      const response = await api.api.me['calendar-feeds'].$post({ json: variables });
      await throwOnFailure(response, 'calendar-feed');
      return await response.json();
    },
    onSuccess: async (body) => {
      if (!('calendarFeeds' in body)) return;
      queryClient.setQueryData<SignedInMember | null>(meKeys.profile(), (member) =>
        withCalendarFeeds(member, body.calendarFeeds),
      );
      await queryClient.invalidateQueries({ queryKey: freeSlotsKeys.all });
    },
  });
}

export function useRemoveCalendarFeed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: { id: string }) => {
      const response = await api.api.me['calendar-feeds'][':id'].$delete({
        param: { id: variables.id },
      });
      await throwOnFailure(response, 'calendar-feed-remove');
      return await response.json();
    },
    onSuccess: async (body) => {
      if (!('calendarFeeds' in body)) return;
      queryClient.setQueryData<SignedInMember | null>(meKeys.profile(), (member) =>
        withCalendarFeeds(member, body.calendarFeeds),
      );
      await queryClient.invalidateQueries({ queryKey: freeSlotsKeys.all });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (variables: { currentPassword: string; newPassword: string }) => {
      const response = await api.api.me.password.$put({ json: variables });
      await throwOnFailure(response, 'password');
      return await response.json();
    },
  });
}

// @FollowsBlueprint query-pessimistic-mutation
export function useRegisterPasskey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: { label: string }) => {
      const optionsResponse = await api.api.me.passkeys.options.$post();
      await throwOnFailure(optionsResponse, 'passkey-options');
      const attestation = await startPasskeyEnrolment(await optionsResponse.json());
      const response = await api.api.me.passkeys.$post({
        json: { label: variables.label, response: attestation },
      });
      await throwOnFailure(response, 'passkey-register');
      return readReturnedPasskey(await response.json());
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: meKeys.passkeys() });
    },
  });
}

export function useRenamePasskey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: { passkeyId: string; label: string }) => {
      const response = await api.api.me.passkeys[':passkeyId'].$patch({
        param: { passkeyId: variables.passkeyId },
        json: { label: variables.label },
      });
      await throwOnFailure(response, 'passkey-rename');
      return readReturnedPasskey(await response.json());
    },
    onSuccess: (renamed) => {
      queryClient.setQueryData<PasskeySummary[]>(meKeys.passkeys(), (passkeys) =>
        passkeys?.map((passkey) => (passkey.id === renamed.id ? renamed : passkey)),
      );
    },
  });
}

// @FollowsBlueprint query-optimistic-mutation
export function useRemovePasskey() {
  const queryClient = useQueryClient();
  const passkeysKey = meKeys.passkeys();
  return useMutation({
    mutationFn: async (variables: { passkeyId: string }) => {
      const response = await api.api.me.passkeys[':passkeyId'].$delete({
        param: { passkeyId: variables.passkeyId },
      });
      await throwOnFailure(response, 'passkey-remove');
      return variables.passkeyId;
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: passkeysKey });
      const snapshot = queryClient.getQueryData<PasskeySummary[]>(passkeysKey);
      if (snapshot !== undefined) {
        queryClient.setQueryData<PasskeySummary[]>(
          passkeysKey,
          withoutPasskey(snapshot, variables.passkeyId),
        );
      }
      return { snapshot };
    },
    onError: (_error, _variables, context) => {
      if (context?.snapshot !== undefined) {
        queryClient.setQueryData<PasskeySummary[]>(passkeysKey, context.snapshot);
      }
    },
  });
}
