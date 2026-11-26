import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '../../i18n/i18n.setup';
import {
  createIsolatedQueryClient,
  type FetchStub,
  jsonResponse,
  stubFetch,
} from '../../lib/queries/queries.test-utils';
import { sendFileToPresignedUrl } from '../../lib/object-upload.adapter';
import { renderPdfPosterAsPng } from '../../lib/pdf-poster.adapter';
import { ConcertPublicPagePanel } from './ConcertPublicPagePanel';

vi.mock('../../lib/pdf-poster.adapter', () => ({ renderPdfPosterAsPng: vi.fn() }));
vi.mock('../../lib/object-upload.adapter', () => ({
  sendFileToPresignedUrl: vi.fn(async () => ({ kind: 'sent' })),
}));

const A_CONCERT = 'aaaaaaaa-1111-4111-8111-111111111111';
const ANNOUNCEMENT = {
  message: 'Free entry',
  posterUrl: 'https://cdn.example/poster.png',
  prizeLabel: '3 beers',
  prizeIcon: 'beer',
};

const UPLOAD_URL = 'https://uploads.example/poster-put';
const POSTER_S3_KEY = 'concert-posters/poster.png';

const activeStubs: FetchStub[] = [];

function renderPanel(): FetchStub {
  const fetchStub = stubFetch(async (request) => {
    if (request.method === 'PATCH') {
      const changes: unknown = await request.clone().json();
      return jsonResponse({ ...ANNOUNCEMENT, ...Object(changes), posterUrl: null });
    }
    if (request.url.includes('/poster-upload')) {
      return jsonResponse({ uploadUrl: UPLOAD_URL, s3Key: POSTER_S3_KEY });
    }
    if (request.url.includes('/registrations')) return jsonResponse({ registrations: [] });
    return jsonResponse(ANNOUNCEMENT);
  });
  activeStubs.push(fetchStub);
  render(
    <QueryClientProvider client={createIsolatedQueryClient()}>
      <ConcertPublicPagePanel sessionId={A_CONCERT} />
    </QueryClientProvider>,
  );
  return fetchStub;
}

async function readBody(call: Request): Promise<unknown> {
  const body: unknown = await call.clone().json();
  return body;
}

async function sentPatches(fetchStub: FetchStub): Promise<unknown[]> {
  const patches = fetchStub.calls.filter((call) => call.method === 'PATCH');
  return await Promise.all(patches.map(readBody));
}

// @FollowsBlueprint test-component-render
describe('the public page tab of a concert', () => {
  afterEach(() => {
    cleanup();
    for (const stub of activeStubs.splice(0)) stub.restore();
  });

  it('saves the prize with the icon picked, and clears a blank message', async () => {
    const fetchStub = renderPanel();
    const label = await screen.findByLabelText('Prize to win');
    fireEvent.change(label, { target: { value: ' 2 tickets ' } });
    fireEvent.click(screen.getByRole('radio', { name: 'Ticket' }));
    fireEvent.change(screen.getByLabelText('Public message'), { target: { value: '  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(async () => {
      expect(await sentPatches(fetchStub)).toEqual([
        { message: null, prizeLabel: '2 tickets', prizeIcon: 'ticket' },
      ]);
    });
  });

  it('draws a PDF poster to a PNG, then uploads that PNG and saves its key', async () => {
    const drawnPoster = new File(['png'], 'poster.png', { type: 'image/png' });
    vi.mocked(renderPdfPosterAsPng).mockResolvedValueOnce(drawnPoster);
    const pdf = new File(['%PDF'], 'affiche.pdf', { type: 'application/pdf' });
    const fetchStub = renderPanel();
    await screen.findByRole('button', { name: 'Remove' });
    const picker = document.body.querySelector('input[type="file"]');
    if (picker === null) throw new Error('the poster file picker is missing');

    fireEvent.change(picker, { target: { files: [pdf] } });

    await waitFor(async () => {
      expect(await sentPatches(fetchStub)).toEqual([{ posterS3Key: POSTER_S3_KEY }]);
    });
    expect(renderPdfPosterAsPng).toHaveBeenCalledWith(pdf);
    const minted = fetchStub.calls.find((call) => call.url.includes('/poster-upload'));
    expect(minted === undefined ? null : await readBody(minted)).toEqual({
      contentType: 'image/png',
      byteSize: drawnPoster.size,
    });
    expect(sendFileToPresignedUrl).toHaveBeenCalledWith(UPLOAD_URL, drawnPoster);
  });

  it('removes the poster', async () => {
    const fetchStub = renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: 'Remove' }));
    await waitFor(async () => {
      expect(await sentPatches(fetchStub)).toEqual([{ posterS3Key: null }]);
    });
    expect(await screen.findByText('Add a poster')).toBeTruthy();
  });
});
