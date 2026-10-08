import type { ParseKeys } from 'i18next';
import { useSyncExternalStore } from 'react';
import type { IconName } from '../components/atoms/Icon';
import type { DiscussionSubjectReference } from './discussion-subject.core';

export interface ActionSheetAction {
  readonly labelKey: ParseKeys;
  readonly icon: IconName;
  readonly onSelect: () => void;
}

export interface ActionSheetContent {
  readonly title: string;
  readonly subject: DiscussionSubjectReference;
  readonly details?: readonly string[];
  readonly actions?: readonly ActionSheetAction[];
}

interface ActionSheetStore {
  shown: ActionSheetContent | null;
}

const actionSheetStore: ActionSheetStore = { shown: null };
const actionSheetListeners = new Set<() => void>();

function publishActionSheet(next: ActionSheetContent | null): void {
  actionSheetStore.shown = next;
  for (const listener of actionSheetListeners) listener();
}

export function openActionSheet(content: ActionSheetContent): void {
  publishActionSheet(content);
}

export function closeActionSheet(): void {
  publishActionSheet(null);
}

function subscribeToActionSheet(onStoreChange: () => void): () => void {
  actionSheetListeners.add(onStoreChange);
  return () => {
    actionSheetListeners.delete(onStoreChange);
  };
}

function readShownActionSheet(): ActionSheetContent | null {
  return actionSheetStore.shown;
}

// @FollowsBlueprint hook-external-store
export function useShownActionSheet(): ActionSheetContent | null {
  return useSyncExternalStore(subscribeToActionSheet, readShownActionSheet, readShownActionSheet);
}
