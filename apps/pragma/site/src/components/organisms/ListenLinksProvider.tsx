/** @Feature songs */

import { type JSX, type ReactNode, useCallback, useState } from 'react';
import { ListenLinksContext } from '../../lib/listen-links.store';
import type { ListenSubject } from '../../lib/listen-links.utils';
import { ListenLinksDialog } from '../molecules/ListenLinksDialog';

export interface ListenLinksProviderProps {
  readonly children: ReactNode;
}

/**
 * @Blueprint organism-dialog-provider
 * @BlueprintName Organism Providing One Dialog To Every Screen
 * @BlueprintUsage Use when a gesture available on many screens has to open the same modal, and prop-drilling the opener would reach every list row in the application.
 * @BlueprintDescription Holds the subject of the open dialog in state and hands the opener down through context, so a row anywhere in the tree opens the dialog by calling a function rather than by rendering one. The dialog is mounted only while a subject is set, which is what makes `showModal` run on attach and needs no open prop to watch.
 */
export function ListenLinksProvider({ children }: ListenLinksProviderProps): JSX.Element {
  const [subject, setSubject] = useState<ListenSubject | null>(null);
  const openListenLinks = useCallback((next: ListenSubject) => {
    setSubject(next);
  }, []);

  return (
    <ListenLinksContext.Provider value={openListenLinks}>
      {children}
      {subject === null ? null : (
        <ListenLinksDialog
          subject={subject}
          onClose={() => {
            setSubject(null);
          }}
        />
      )}
    </ListenLinksContext.Provider>
  );
}
