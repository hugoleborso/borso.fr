import { useListenLinks } from './listen-links.store';
import type { ListenSubject } from './listen-links.utils';
import { type LongPressHandlers, useLongPress } from './long-press.hook';

export function useSongLongPress(subject: ListenSubject): LongPressHandlers {
  const openListenLinks = useListenLinks();
  return useLongPress(() => {
    openListenLinks(subject);
  });
}
