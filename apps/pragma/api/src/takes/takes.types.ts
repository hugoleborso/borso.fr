import type { TakeContentType } from '@domain/take-upload.core';

export interface TakeRow {
  readonly id: string;
  readonly songId: string;
  readonly sessionId: string | null;
  readonly memberId: string;
  readonly authorName: string | null;
  readonly objectKey: string;
  readonly contentType: TakeContentType;
  readonly durationSeconds: number;
  readonly recordedAt: Date;
  readonly createdAt: Date;
}

export interface TakeView extends TakeRow {
  readonly commentCount: number;
}

export interface TakeCommentView {
  readonly id: string;
  readonly takeId: string;
  readonly memberId: string;
  readonly authorName: string | null;
  readonly body: string;
  readonly atSeconds: number | null;
  readonly createdAt: Date;
}

export interface TakeInsert {
  readonly id: string;
  readonly songId: string;
  readonly sessionId: string | null;
  readonly memberId: string;
  readonly objectKey: string;
  readonly contentType: TakeContentType;
  readonly durationSeconds: number;
  readonly recordedAt: Date;
  readonly createdAt: Date;
}

export interface TakeCommentInsert {
  readonly takeId: string;
  readonly memberId: string;
  readonly body: string;
  readonly atSeconds: number | null;
  readonly createdAt: Date;
}

export interface TakeCommentChanges {
  readonly body?: string;
  readonly atSeconds?: number | null;
}

export type TakeUploadOutcome =
  | {
      readonly kind: 'ok';
      readonly uploadUrl: string;
      readonly objectKey: string;
      readonly expiresAt: string;
    }
  | { readonly kind: 'song-not-found' };

export type TakeCreateOutcome =
  | { readonly kind: 'ok'; readonly take: TakeView }
  | { readonly kind: 'song-not-found' }
  | { readonly kind: 'session-not-found' }
  | { readonly kind: 'object-key-mismatch' };

export type TakeCommentWriteOutcome =
  | { readonly kind: 'ok'; readonly comment: TakeCommentView }
  | { readonly kind: 'take-not-found' }
  | { readonly kind: 'comment-not-found' }
  | { readonly kind: 'moment-past-end' };

export type TakeCommentsOutcome =
  | { readonly kind: 'ok'; readonly comments: TakeCommentView[] }
  | { readonly kind: 'take-not-found' };
