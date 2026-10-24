import type { TakeContentType } from '@domain/take-upload.core';
import type { takeCommentTable, takeTable } from './takes.schema';

type TakeTableRow = typeof takeTable.$inferSelect;
type TakeCommentTableRow = typeof takeCommentTable.$inferSelect;
type TakeCommentTableInsert = typeof takeCommentTable.$inferInsert;

interface WithAuthorName {
  readonly authorName: string | null;
}

export type TakeRow = Omit<TakeTableRow, 'contentType'> &
  WithAuthorName & { readonly contentType: TakeContentType };

export type TakeView = TakeRow & { readonly commentCount: number };

export type TakeCommentView = TakeCommentTableRow & WithAuthorName;

export type TakeInsert = Omit<typeof takeTable.$inferInsert, 'contentType'> & {
  readonly contentType: TakeContentType;
};

export type TakeCommentInsert = Omit<TakeCommentTableInsert, 'id'>;

export type TakeCommentChanges = Partial<Pick<TakeCommentTableInsert, 'body' | 'atSeconds'>>;

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
