import { afterEach, describe, expect, it, vi } from 'vitest';
import '../../i18n/i18n.setup';
import { followLinkOnAttach } from '../../lib/departure.adapter';
import { createIsolatedQueryClient, mountWithClient } from '../../lib/queries/queries.test-utils';
import { TalkRedirect } from './TalkRedirect';

const ADDRESS = 'https://claude.ai/code/new?repo=proprietaire%2Fnotes&q=Bonjour';

vi.mock('../../lib/departure.adapter', () => ({ followLinkOnAttach: vi.fn() }));
vi.mock('../../lib/talk-to-talos.hook', () => ({
  useTalkToTalosLink: () => ({
    href: ADDRESS,
    target: '_blank',
    isPending: false,
    retry: () => undefined,
  }),
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe('TalkRedirect', () => {
  it('leaves for the link to Claude Code as soon as it is drawn', () => {
    const tree = mountWithClient(createIsolatedQueryClient(), <TalkRedirect />);
    const link = tree.container.querySelector('a');
    expect(link?.getAttribute('href')).toBe(ADDRESS);
    expect(followLinkOnAttach).toHaveBeenCalledWith(link);
    tree.unmount();
  });
});
