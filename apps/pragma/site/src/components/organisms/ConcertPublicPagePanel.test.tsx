import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '../../i18n/i18n.setup';
import {
  createIsolatedQueryClient,
  deferred,
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

const LEA = {
  id: 'cccccccc-3333-4333-8333-333333333333',
  firstName: 'Léa',
  email: 'lea@example.com',
  registeredAt: '2026-11-20T18:00:00.000Z',
  comingFor: null,
  wishedSong: null,
};
const MAX = {
  ...LEA,
  id: 'dddddddd-4444-4444-8444-444444444444',
  firstName: 'Max',
  email: 'max@example.com',
};

function answerRemovalWith(status: number): (request: Request) => Promise<Response> {
  return () => Promise.resolve(new Response(null, { status }));
}

function renderPanel(
  registrations: readonly unknown[] = [],
  answerRemoval = answerRemovalWith(204),
): FetchStub {
  const fetchStub = stubFetch(async (request) => {
    if (request.method === 'DELETE') return await answerRemoval(request);
    if (request.method === 'PATCH') {
      const changes: unknown = await request.clone().json();
      return jsonResponse({ ...ANNOUNCEMENT, ...Object(changes), posterUrl: null });
    }
    if (request.url.includes('/poster-upload')) {
      return jsonResponse({ uploadUrl: UPLOAD_URL, s3Key: POSTER_S3_KEY });
    }
    if (request.url.includes('/registrations')) return jsonResponse({ registrations });
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

async function confirmRemovalOf(firstName: string): Promise<void> {
  fireEvent.click(await screen.findByRole('button', { name: `Remove ${firstName}` }));
  fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Remove' }));
}

// @FollowsBlueprint test-component-render
describe('the public page tab of a concert', () => {
  afterEach(() => {
    cleanup();
    for (const stub of activeStubs.splice(0)) stub.restore();
  });

  it('removes a registration once confirmed, so it leaves the list and the draw', async () => {
    const fetchStub = renderPanel([LEA, MAX]);
    fireEvent.click(await screen.findByRole('button', { name: 'Remove Léa' }));
    expect(screen.getByText(/Remove Léa \(lea@example.com\) from this concert\?/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(fetchStub.calls.some((call) => call.method === 'DELETE')).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Remove Léa' }));
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Remove' }),
    );
    await waitFor(() => {
      expect(screen.queryByText('lea@example.com')).toBeNull();
    });
    const removal = fetchStub.calls.find((call) => call.method === 'DELETE');
    expect(removal?.url).toContain(
      `/api/concert-registrations/concerts/${A_CONCERT}/registrations/${LEA.id}`,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Draw 3 winners' }));
    expect(screen.getByRole('status').textContent).toContain('Max (max@example.com)');
    expect(screen.getByRole('status').textContent).not.toContain('Léa');
  });

  it('puts a registration back and says so when the removal fails', async () => {
    renderPanel([LEA], answerRemovalWith(500));
    fireEvent.click(await screen.findByRole('button', { name: 'Remove Léa' }));
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Remove' }),
    );
    expect(await screen.findByText(/The registration was not removed/)).toBeTruthy();
    expect(screen.getByText('lea@example.com')).toBeTruthy();
  });

  it('keeps a registration out of the list when its removal succeeds after an earlier one failed', async () => {
    const leaRemoval = deferred<Response>();
    const maxRemoval = deferred<Response>();
    renderPanel(
      [LEA, MAX],
      async (request) =>
        await (request.url.endsWith(LEA.id) ? leaRemoval.promise : maxRemoval.promise),
    );
    await confirmRemovalOf('Léa');
    await confirmRemovalOf('Max');
    leaRemoval.resolve(new Response(null, { status: 500 }));
    expect(await screen.findByText('lea@example.com')).toBeTruthy();
    maxRemoval.resolve(new Response(null, { status: 204 }));
    await waitFor(() => {
      expect(screen.queryByText('max@example.com')).toBeNull();
    });
    expect(screen.getByText('lea@example.com')).toBeTruthy();
  });

  it('takes a removed registration off the winners already drawn, and hides them once none is left', async () => {
    renderPanel([LEA, MAX]);
    await screen.findByText('max@example.com');
    fireEvent.click(screen.getByRole('button', { name: 'Draw 3 winners' }));
    expect(screen.getByRole('status').textContent).toContain('Léa (lea@example.com)');
    await confirmRemovalOf('Léa');
    await waitFor(() => {
      expect(screen.getByRole('status').textContent).not.toContain('Léa');
    });
    expect(screen.getByRole('status').textContent).toContain('Max (max@example.com)');
    await confirmRemovalOf('Max');
    await waitFor(() => {
      expect(screen.queryByRole('status')).toBeNull();
    });
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
