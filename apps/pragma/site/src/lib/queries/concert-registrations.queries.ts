/** @Feature concert-registrations */

import { PRAGMA_REQUEST_HEADERS } from '@domain/request-headers.core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InferResponseType } from 'hono/client';
import { z } from 'zod';
import { ApiError, api } from '../api.client';
import { sendFileToPresignedUrl } from '../object-upload.adapter';
import { writeKeepingStaleness } from './cache-write.queries';
import {
  forgetRegistration,
  rememberFirstRegistration,
  type StoredRegistration,
} from '../registration-token.adapter';
import type { ConcertPrizeIcon } from '@domain/concert-prize.core';
import {
  checkPoster,
  isPdfPoster,
  type PosterContentType,
  PosterRefusal,
} from '../../routes/concerts/concert-public-page.core';
import { isRegistrationGone } from '../../routes/concerts/concert-sign-up.core';
import { renderPdfPosterAsPng } from '../pdf-poster.adapter';

export const concertRegistrationKeys = {
  all: ['concert-registrations'] as const,
  upcoming: () => [...concertRegistrationKeys.all, 'upcoming'] as const,
  members: () => [...concertRegistrationKeys.all, 'members'] as const,
  announcement: (sessionId: string) =>
    [...concertRegistrationKeys.all, 'announcement', sessionId] as const,
  registrations: (sessionId: string) =>
    [...concertRegistrationKeys.all, 'registrations', sessionId] as const,
  fanWishes: () => [...concertRegistrationKeys.all, 'fan-wishes'] as const,
  remembered: (registrationId: string) =>
    [...concertRegistrationKeys.all, 'remembered', registrationId] as const,
};

const concertRegistrationsApi = api.api['concert-registrations'];

const STALE_ON_EVERY_VISIT_MS = 0;
const CHECKED_ONCE_PER_VISIT = Infinity;
const CONCERT_REGISTRATIONS_WRITE_SCOPE = { id: 'concert-registrations-writes' } as const;

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
      rememberFirstRegistration(variables.sessionId, registration);
    },
  });
}

export interface RememberedRegistrationCheck {
  readonly isStanding: boolean;
}

const NOTHING_REMEMBERED: StoredRegistration = { registrationId: '', editToken: '' };

export function useRememberedRegistrationCheck(
  sessionId: string,
  remembered: StoredRegistration | null,
) {
  const registration = remembered ?? NOTHING_REMEMBERED;
  return useQuery({
    queryKey: concertRegistrationKeys.remembered(registration.registrationId),
    queryFn: async (): Promise<RememberedRegistrationCheck> => {
      const response = await concertRegistrationsApi.registrations[':registrationId'].$get(
        { param: { registrationId: registration.registrationId } },
        { headers: { [PRAGMA_REQUEST_HEADERS.registrationToken]: registration.editToken } },
      );
      const isGone = isRegistrationGone(response.status);
      if (isGone) {
        forgetRegistration(sessionId);
        return { isStanding: false };
      }
      if (!response.ok) throw new ApiError(response.status, `check ${response.status}`, null);
      return { isStanding: true };
    },
    enabled: remembered !== null,
    staleTime: CHECKED_ONCE_PER_VISIT,
    retry: false,
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

interface RemoveRegistrationVariables {
  readonly sessionId: string;
  readonly registrationId: string;
}

interface RegistrationsSnapshot {
  readonly previousRegistrations: RegistrationsResponse | undefined;
}

// @FollowsBlueprint query-optimistic-mutation
export function useRemoveConcertRegistration() {
  const queryClient = useQueryClient();
  return useMutation({
    scope: CONCERT_REGISTRATIONS_WRITE_SCOPE,
    mutationKey: concertRegistrationKeys.all,
    mutationFn: async (variables: RemoveRegistrationVariables) => {
      const response = await concertRegistrationsApi.concerts[':sessionId'].registrations[
        ':registrationId'
      ].$delete({ param: variables });
      if (!response.ok) throw new ApiError(response.status, `remove ${response.status}`, null);
    },
    onMutate: async (variables): Promise<RegistrationsSnapshot> => {
      const key = concertRegistrationKeys.registrations(variables.sessionId);
      await queryClient.cancelQueries({ queryKey: key });
      const previousRegistrations = queryClient.getQueryData<RegistrationsResponse>(key);
      writeKeepingStaleness<RegistrationsResponse>(queryClient, key, (old) => {
        if (old === undefined) return old;
        return {
          registrations: old.registrations.filter(
            (registration) => registration.id !== variables.registrationId,
          ),
        };
      });
      return { previousRegistrations };
    },
    onError: (_error, variables, context) => {
      if (context?.previousRegistrations === undefined) return;
      writeKeepingStaleness(
        queryClient,
        concertRegistrationKeys.registrations(variables.sessionId),
        context.previousRegistrations,
      );
    },
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
  readonly prizeLabel?: string | null;
  readonly prizeIcon?: ConcertPrizeIcon;
  readonly poster?: File | null;
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

async function preparePoster(file: File): Promise<PosterFile> {
  const isPdf = isPdfPoster(file.type);
  const image = isPdf ? await renderPdfPosterAsPng(file) : file;
  const { contentType, refusalKey } = checkPoster(image.type, image.size);
  if (contentType === null) throw new PosterRefusal(refusalKey ?? 'sessions.posterWrongType');
  return { file: image, contentType };
}

async function savePoster(sessionId: string, poster: File | null | undefined) {
  if (poster === undefined || poster === null) return poster;
  return await uploadPoster(sessionId, await preparePoster(poster));
}

// @FollowsBlueprint query-pessimistic-mutation
export function useSaveConcertAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: AnnouncementVariables) => {
      const posterS3Key = await savePoster(variables.sessionId, variables.poster);
      const response = await concertRegistrationsApi.concerts[':sessionId'].announcement.$patch({
        param: { sessionId: variables.sessionId },
        json: {
          ...(variables.message === undefined ? {} : { message: variables.message }),
          ...(variables.prizeLabel === undefined ? {} : { prizeLabel: variables.prizeLabel }),
          ...(variables.prizeIcon === undefined ? {} : { prizeIcon: variables.prizeIcon }),
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
