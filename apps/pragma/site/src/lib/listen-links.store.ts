import { createContext, useContext } from 'react';
import type { ListenSubject } from './listen-links.utils';

export type OpenListenLinks = (subject: ListenSubject) => void;

const refuseOutsideProvider: OpenListenLinks = () => {
  throw new Error('useListenLinks was called outside a ListenLinksProvider');
};

export const ListenLinksContext = createContext<OpenListenLinks>(refuseOutsideProvider);

export function useListenLinks(): OpenListenLinks {
  return useContext(ListenLinksContext);
}
