import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../i18n/i18n.setup';
import {
  createIsolatedQueryClient,
  jsonResponse,
  stubFetch,
  type FetchStub,
} from '../../lib/queries/queries.test-utils';
import { recordProductEvent } from '../../observability/product-event.adapter';
import { TransitionCommentModal } from './TransitionCommentModal';

vi.mock('../../observability/product-event.adapter', () => ({
  recordProductEvent: vi.fn(),
}));
import { stubSheetDialog } from '../molecules/sheet.test-utils';

const SONG_A = 'superstition';
const DRAFT = 'Enchainer sans pause';

function renderModal(songBId: string, queryClient = createIsolatedQueryClient()) {
  const onClose = vi.fn();
  const view = render(
    <QueryClientProvider client={queryClient}>
      <TransitionCommentModal
        songAId={SONG_A}
        songBId={songBId}
        songATitle="Superstition"
        songBTitle="Valerie"
        onClose={onClose}
      />
    </QueryClientProvider>,
  );
  return { ...view, onClose, queryClient };
}

// @FollowsBlueprint test-component-render
describe('a transition comment draft', () => {
  let stub: FetchStub | null = null;
  const savedComments: string[] = [];

  beforeEach(() => {
    stubSheetDialog();
    savedComments.length = 0;
    stub = stubFetch(async (request) => {
      if (request.method === 'PUT') {
        const body: unknown = await request.json();
        const comment =
          typeof body === 'object' && body !== null && 'comment' in body
            ? String(body.comment)
            : '';
        savedComments.push(comment);
        return jsonResponse({
          comment: { songAId: SONG_A, songBId: 'respect', comment, updatedAt: '2026-10-27' },
        });
      }
      return new Response(null, { status: 404 });
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    stub?.restore();
  });

  it('is kept after a click on the backdrop and shown on reopening', async () => {
    const first = renderModal('valerie');
    fireEvent.change(await screen.findByRole('textbox'), { target: { value: DRAFT } });
    fireEvent.click(screen.getByRole('dialog'));
    expect(first.onClose).toHaveBeenCalled();
    first.unmount();
    renderModal('valerie', first.queryClient);
    expect(await screen.findByDisplayValue(DRAFT)).toBeTruthy();
  });

  it('is gone once saved: reopening shows the saved comment, then only what the server holds', async () => {
    const first = renderModal('respect');
    fireEvent.change(await screen.findByRole('textbox'), { target: { value: DRAFT } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      expect(first.onClose).toHaveBeenCalled();
    });
    expect(savedComments).toEqual([DRAFT]);
    expect(recordProductEvent).toHaveBeenCalledExactlyOnceWith('transition_comment_saved');
    first.unmount();
    const second = renderModal('respect', first.queryClient);
    expect(await screen.findByDisplayValue(DRAFT)).toBeTruthy();
    second.unmount();
    first.queryClient.removeQueries();
    renderModal('respect', first.queryClient);
    expect(await screen.findByRole('textbox')).toHaveProperty('value', '');
  });
});
