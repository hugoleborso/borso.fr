import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import '../../i18n/i18n.setup';
import {
  createIsolatedQueryClient,
  type FetchStub,
  jsonResponse,
  stubFetch,
} from '../../lib/queries/queries.test-utils';
import { BandLinksSection } from './BandLinksSection';

const PHOTOS = {
  id: '11111111-1111-4111-8111-111111111111',
  label: 'Photos',
  url: 'https://drive.example.com/drive/folders/photos',
  createdAt: '2026-11-15T10:00:00.000Z',
};
const VIDEOS_ADDRESS = 'https://drive.example.com/drive/folders/videos';
const BAND_LINKS_PATH = '/api/band-links';

interface BandLinkBody {
  readonly id: string;
  readonly label: string;
  readonly url: string;
}

function isBandLinkBody(value: unknown): value is BandLinkBody {
  return typeof value === 'object' && value !== null && 'id' in value && 'url' in value;
}

const activeStubs: FetchStub[] = [];

function stubBandLinksApi(): FetchStub {
  const stub = stubFetch(async (request) => {
    const path = new URL(request.url).pathname;
    if (request.method === 'GET') return jsonResponse({ bandLinks: [PHOTOS] });
    if (request.method === 'POST') {
      const body: unknown = await request.clone().json();
      if (!isBandLinkBody(body)) return jsonResponse({ error: 'bad-body' }, 400);
      return jsonResponse({ bandLink: { ...body, createdAt: PHOTOS.createdAt } }, 201);
    }
    return jsonResponse({ id: path.split('/').at(-1), deleted: true });
  });
  activeStubs.push(stub);
  return stub;
}

function renderSection(): void {
  render(
    <QueryClientProvider client={createIsolatedQueryClient()}>
      <BandLinksSection />
    </QueryClientProvider>,
  );
}

async function findLinkList(): Promise<HTMLElement> {
  const list = screen.getByRole('list', { name: 'Links' });
  await within(list).findByRole('link', { name: /Photos/ });
  return list;
}

// @FollowsBlueprint test-component-render
describe('BandLinksSection', () => {
  afterEach(() => {
    cleanup();
    for (const stub of activeStubs.splice(0)) stub.restore();
  });

  it('opens each link in a new tab and names its host', async () => {
    stubBandLinksApi();
    renderSection();
    const link = within(await findLinkList()).getByRole('link', { name: /Photos/ });
    expect(link.getAttribute('href')).toBe(PHOTOS.url);
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    expect(link.textContent).toContain('drive.example.com');
  });

  it('adds a named https link from the sheet and lists it after the others', async () => {
    const stub = stubBandLinksApi();
    renderSection();
    const list = await findLinkList();

    fireEvent.click(screen.getByRole('button', { name: 'Add a link' }));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: ' Concert videos ' } });
    fireEvent.change(screen.getByLabelText('Address'), { target: { value: VIDEOS_ADDRESS } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => {
      expect(
        within(list)
          .getAllByRole('link')
          .map((link) => link.getAttribute('href')),
      ).toEqual([PHOTOS.url, VIDEOS_ADDRESS]);
    });
    const posted = stub.calls.find((request) => request.method === 'POST');
    expect(posted === undefined ? null : await posted.json()).toEqual(
      expect.objectContaining({ label: 'Concert videos', url: VIDEOS_ADDRESS }),
    );
    expect(screen.queryByLabelText('Address')).toBe(null);
  });

  it('refuses an address that is not https and sends nothing', async () => {
    const stub = stubBandLinksApi();
    renderSection();
    await findLinkList();

    fireEvent.click(screen.getByRole('button', { name: 'Add a link' }));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Photos' } });
    fireEvent.change(screen.getByLabelText('Address'), {
      target: { value: 'http://drive.example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect((await screen.findByRole('alert')).textContent).toBe(
      'The address must start with https://.',
    );
    expect(stub.calls.filter((request) => request.method === 'POST')).toEqual([]);
  });

  it('deletes a link only once the member confirms', async () => {
    const stub = stubBandLinksApi();
    renderSection();
    const list = await findLinkList();

    fireEvent.click(within(list).getByRole('button', { name: 'Delete the link' }));
    expect(screen.getByRole('alertdialog').textContent).toContain('“Photos”');
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete the link' }),
    );

    await waitFor(() => {
      expect(within(list).queryAllByRole('link')).toEqual([]);
    });
    const deletion = stub.calls.find((request) => request.method === 'DELETE');
    expect(deletion === undefined ? null : new URL(deletion.url).pathname).toBe(
      `${BAND_LINKS_PATH}/${PHOTOS.id}`,
    );
  });
});
