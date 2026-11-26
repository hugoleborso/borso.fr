/** @Feature concert-registrations */

import { PRAGMA_REQUEST_HEADERS } from '@domain/request-headers.core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InferResponseType } from 'hono/client';
import { z } from 'zod';
import { ApiError, api } from '../api.client';
import { sendFileToPresignedUrl } from '../object-upload.adapter';
import { writeKeepingStaleness } from './cache-write.queries';
import { type StoredRegistration, writeRegistration } from '../registration-token.adapter';
import type { PosterContentType } from '../../routes/concerts/concert-public-page.core';

export const concertRegistrationKeys = {
  all: ['concert-registrations'] as const,
  upcoming: () => [...concertRegistrationKeys.all, 'upcoming'] as const,
  members: () => [...concertRegistrationKeys.all, 'members'] as const,
  announcement: (sessionId: string) =>
    [...concertRegistrationKeys.all, 'announcement', sessionId] as const,
  registrations: (sessionId: string) =>
    [...concertRegistrationKeys.all, 'registrations', sessionId] as const,
  fanWishes: () => [...concertRegistrationKeys.all, 'fan-wishes'] as const,
};

const concertRegistrationsApi = api.api['concert-registrations'];

const STALE_ON_EVERY_VISIT_MS = 0;

type UpcomingConcertsResponse = InferResponseType<typeof concertRegistrationsApi.upcoming.$get>;
export type UpcomingConcert = UpcomingConcertsResponse['concerts'][number];
type RegistrationsResponse = InferResponseType<
  (typeof concertRegistrationsApi.concerts)[':sessionId']['registrations']['$get'],
  200
>;
export type ConcertRegistrationEntry = RegistrationsResponse['registrations'][number];

// @FollowsBlueprint query-module
export function useUpcomingConcerts() {
  return useQuery({
    queryKey: concertRegistrationKeys.upcoming(),
    queryFn: async () => {
      const response = await api.api['concert-registrations'].upcoming.$get();
      if (!response.ok) throw new ApiError(response.status, `upcoming ${response.status}`, null);
      return response.json();
    },
    staleTime: STALE_ON_EVERY_VISIT_MS,
  });
}

export function useConcertMemberNames(isEnabled: boolean) {
  return useQuery({
    queryKey: concertRegistrationKeys.members(),
    queryFn: async () => {
      const response = await api.api['concert-registrations'].members.$get();
      if (!response.ok) throw new ApiError(response.status, `members ${response.status}`, null);
      return response.json();
    },
    enabled: isEnabled,
  });
}

const createdRegistrationSchema = z.object({
  registrationId: z.string().min(1),
  editToken: z.string().min(1),
});

export interface RegisterVariables {
  readonly sessionId: string;
  readonly firstName: string;
  readonly email: string;
}

// @FollowsBlueprint query-pessimistic-mutation
export function useRegisterForConcert() {
  return useMutation({
    mutationFn: async (variables: RegisterVariables): Promise<StoredRegistration> => {
      const response = await concertRegistrationsApi.concerts[':sessionId'].registrations.$post({
        param: { sessionId: variables.sessionId },
        json: { firstName: variables.firstName, email: variables.email },
      });
      const body: unknown = await response.json().catch(() => null);
      const created = createdRegistrationSchema.safeParse(body);
      if (!created.success)
        throw new ApiError(response.status, `register ${response.status}`, body);
      return created.data;
    },
    onSuccess: (registration, variables) => {
      writeRegistration(variables.sessionId, registration);
    },
  });
}

interface AmendVariables {
  readonly registration: StoredRegistration;
  readonly comingForMemberId: string | null;
  readonly wishedTrackId: string | null;
}

// @FollowsBlueprint query-pessimistic-mutation
export function useAmendRegistration() {
  return useMutation({
    mutationFn: async (variables: AmendVariables) => {
      const response = await concertRegistrationsApi.registrations[':registrationId'].$patch(
        {
          param: { registrationId: variables.registration.registrationId },
          json: {
            comingForMemberId: variables.comingForMemberId,
            ...(variables.wishedTrackId === null ? {} : { wishedTrackId: variables.wishedTrackId }),
          },
        },
        {
          headers: {
            [PRAGMA_REQUEST_HEADERS.registrationToken]: variables.registration.editToken,
          },
        },
      );
      if (!response.ok) {
        const refusal: unknown = await response.json().catch(() => null);
        throw new ApiError(response.status, `amend ${response.status}`, refusal);
      }
      return response.json();
    },
  });
}

export function useConcertAnnouncement(sessionId: string) {
  return useQuery({
    queryKey: concertRegistrationKeys.announcement(sessionId),
    queryFn: async () => {
      const response = await api.api['concert-registrations'].concerts[
        ':sessionId'
      ].announcement.$get({ param: { sessionId } });
      if (!response.ok)
        throw new ApiError(response.status, `announcement ${response.status}`, null);
      return response.json();
    },
  });
}

export function useConcertRegistrations(sessionId: string) {
  return useQuery({
    queryKey: concertRegistrationKeys.registrations(sessionId),
    queryFn: async () => {
      const response = await api.api['concert-registrations'].concerts[
        ':sessionId'
      ].registrations.$get({ param: { sessionId } });
      if (!response.ok)
        throw new ApiError(response.status, `registrations ${response.status}`, null);
      return response.json();
    },
    staleTime: STALE_ON_EVERY_VISIT_MS,
  });
}

export function useFanWishSongIds(isEnabled: boolean) {
  return useQuery({
    queryKey: concertRegistrationKeys.fanWishes(),
    queryFn: async () => {
      const response = await api.api['concert-registrations']['fan-wishes'].$get();
      if (!response.ok) throw new ApiError(response.status, `fan wishes ${response.status}`, null);
      return response.json();
    },
    enabled: isEnabled,
  });
}

export interface PosterFile {
  readonly file: File;
  readonly contentType: PosterContentType;
}

interface AnnouncementVariables {
  readonly sessionId: string;
  readonly message?: string | null;
  readonly poster?: PosterFile;
}

const UPLOAD_REFUSED_STATUS = 502;

async function uploadPoster(sessionId: string, poster: PosterFile): Promise<string> {
  const minted = await concertRegistrationsApi.concerts[':sessionId']['poster-upload'].$post({
    param: { sessionId },
    json: { contentType: poster.contentType, byteSize: poster.file.size },
  });
  if (!minted.ok) throw new ApiError(minted.status, `poster upload ${minted.status}`, null);
  const { uploadUrl, s3Key } = await minted.json();
  const sent = await sendFileToPresignedUrl(uploadUrl, poster.file);
  if (sent.kind !== 'sent') throw new ApiError(UPLOAD_REFUSED_STATUS, `poster ${sent.kind}`, null);
  return s3Key;
}

// @FollowsBlueprint query-pessimistic-mutation
export function useSaveConcertAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: AnnouncementVariables) => {
      const posterS3Key =
        variables.poster === undefined
          ? undefined
          : await uploadPoster(variables.sessionId, variables.poster);
      const response = await concertRegistrationsApi.concerts[':sessionId'].announcement.$patch({
        param: { sessionId: variables.sessionId },
        json: {
          ...(variables.message === undefined ? {} : { message: variables.message }),
          ...(posterS3Key === undefined ? {} : { posterS3Key }),
        },
      });
      if (!response.ok)
        throw new ApiError(response.status, `announcement ${response.status}`, null);
      return response.json();
    },
    onSuccess: (announcement, variables) => {
      writeKeepingStaleness(
        queryClient,
        concertRegistrationKeys.announcement(variables.sessionId),
        announcement,
      );
    },
  });
}
