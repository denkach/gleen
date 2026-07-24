import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { HistoryItem } from '@/lib/history/repository';

import { HistoryItemActions } from './history-item-actions';

const item: HistoryItem = {
  id: '22222222-2222-4222-8222-222222222222',
  sourceId: 'video-1',
  href: '/app/video/22222222-2222-4222-8222-222222222222',
  title: 'Systems Thinking',
  channel: 'Frame School',
  thumbnailUrl: 'https://i.ytimg.com/vi/video-1/hqdefault.jpg',
  source: 'https://youtube.com/watch?v=video-1',
  language: 'English',
  outputLocale: 'en',
  durationSeconds: 2_829,
  durationLabel: '47:09',
  analyzedAt: '2026-07-06T09:12:00.000Z',
  analyzedAtLabel: 'Jul 6, 2026, 9:12 AM',
  lastOpenedAt: null,
  lastOpenedAtLabel: null,
  status: { key: 'ready', label: 'Ready' },
  favorite: false,
  selectedArtifacts: ['summary', 'flashcards'],
  readyArtifacts: ['summary'],
  canExport: true,
  titleRevision: '2026-07-06T09:12:00.000Z',
};

function setup(
  overrides: Partial<Parameters<typeof HistoryItemActions>[0]> = {},
) {
  const props: Parameters<typeof HistoryItemActions>[0] = {
    item,
    toggleFavorite: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
    renameItem: vi.fn().mockResolvedValue({
      ok: true,
      data: { updatedAt: '2026-07-24T12:00:01.000Z' },
    }),
    deleteItem: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
    markOpened: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
    onChange: vi.fn(),
    onDelete: vi.fn(),
    onAnnouncement: vi.fn(),
    ...overrides,
  };
  render(<HistoryItemActions {...props} />);
  return props;
}

async function openMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    screen.getByRole('button', { name: 'Actions for Systems Thinking' }),
  );
}

describe('HistoryItemActions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('optimistically favorites with a selected state and rolls back on failure', async () => {
    const user = userEvent.setup();
    let resolveFavorite:
      | ((value: { ok: false; code: 'failed'; message: string }) => void)
      | undefined;
    const toggleFavorite = vi.fn(
      () =>
        new Promise<{ ok: false; code: 'failed'; message: string }>(
          (resolve) => {
            resolveFavorite = resolve;
          },
        ),
    );
    const props = setup({ toggleFavorite });
    const favorite = screen.getByRole('button', {
      name: 'Add Systems Thinking to favorites',
    });

    await user.click(favorite);
    expect(favorite).toHaveAttribute('aria-pressed', 'true');
    expect(favorite).toHaveAttribute('data-selected', 'true');
    expect(toggleFavorite).toHaveBeenCalledWith({
      analysisId: item.id,
      favorite: true,
    });

    resolveFavorite?.({
      ok: false,
      code: 'failed',
      message: 'Could not save favorite.',
    });
    expect(
      await screen.findByRole('button', {
        name: 'Add Systems Thinking to favorites',
      }),
    ).toHaveAttribute('aria-pressed', 'false');
    expect(props.onAnnouncement).toHaveBeenCalledWith(
      'Could not save favorite.',
    );
  });

  it('rolls back and clears favorite pending state when the action rejects', async () => {
    const user = userEvent.setup();
    const props = setup({
      toggleFavorite: vi.fn().mockRejectedValue(new Error('transport failed')),
    });

    await user.click(
      screen.getByRole('button', {
        name: 'Add Systems Thinking to favorites',
      }),
    );

    const favorite = await screen.findByRole('button', {
      name: 'Add Systems Thinking to favorites',
    });
    expect(favorite).toBeEnabled();
    expect(favorite).toHaveAttribute('aria-pressed', 'false');
    expect(props.onAnnouncement).toHaveBeenCalledWith(
      'We could not update History. Try again.',
    );
  });

  it('offers the exact saved-result routes and only exposes Export when artifacts are ready', async () => {
    const user = userEvent.setup();
    const props = setup();
    await openMenu(user);

    expect(screen.getByRole('menuitem', { name: 'Open' })).toHaveAttribute(
      'href',
      item.href,
    );
    expect(screen.getByRole('menuitem', { name: 'Export' })).toHaveAttribute(
      'href',
      `${item.href}#export`,
    );
    const preventNavigation = (event: MouseEvent) => event.preventDefault();
    document.addEventListener('click', preventNavigation);
    await user.click(screen.getByRole('menuitem', { name: 'Open' }));
    document.removeEventListener('click', preventNavigation);
    expect(props.markOpened).toHaveBeenCalledWith({ analysisId: item.id });
  });

  it.each([
    ['ready', 'Ready', '/app/video/ready', 'Open'],
    ['partial', 'Partial', '/app/video/partial', 'Open'],
    ['processing', 'Processing', '/app?analysis=processing', 'Continue'],
    ['failed', 'Failed', '/app?analysis=failed', 'Continue'],
  ] as const)(
    'uses only the approved destination label for %s',
    async (key, label, href, expectedLabel) => {
      const user = userEvent.setup();
      setup({
        item: {
          ...item,
          id: key,
          title: `${label} title`,
          href,
          status: { key, label },
          canExport: key === 'ready' || key === 'partial',
        },
      });

      await user.click(
        screen.getByRole('button', { name: `Actions for ${label} title` }),
      );
      expect(
        screen.getByRole('menuitem', { name: expectedLabel }),
      ).toHaveAttribute('href', href);
      expect(
        screen.queryByRole('menuitem', {
          name: 'Continue studying',
        }),
      ).not.toBeInTheDocument();
    },
  );

  it('does not expose Export when no artifacts are ready', async () => {
    const user = userEvent.setup();
    setup({
      item: {
        ...item,
        id: 'processing',
        title: 'Processing title',
        href: '/app?analysis=processing',
        status: { key: 'processing', label: 'Processing' },
        canExport: false,
        readyArtifacts: [],
      },
    });
    await user.click(
      screen.getByRole('button', { name: 'Actions for Processing title' }),
    );
    expect(
      screen.queryByRole('menuitem', { name: 'Export' }),
    ).not.toBeInTheDocument();
  });

  it('validates a trimmed rename, keeps the dialog on failure, and updates title revision on success', async () => {
    const user = userEvent.setup();
    const renameItem = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        code: 'conflict',
        message: 'This title changed elsewhere.',
      })
      .mockResolvedValueOnce({
        ok: true,
        data: { updatedAt: '2026-07-24T12:00:01.000Z' },
      });
    const props = setup({ renameItem });

    await openMenu(user);
    await user.click(screen.getByRole('menuitem', { name: 'Rename' }));
    const input = screen.getByRole('textbox', { name: 'Title' });
    await user.clear(input);
    await user.type(input, '   ');
    await user.click(screen.getByRole('button', { name: 'Save title' }));
    expect(renameItem).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Enter a title before saving.',
    );

    await user.clear(input);
    await user.type(input, '  A clearer title  ');
    await user.click(screen.getByRole('button', { name: 'Save title' }));
    expect(renameItem).toHaveBeenNthCalledWith(1, {
      analysisId: item.id,
      title: 'A clearer title',
      expectedUpdatedAt: item.titleRevision,
    });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(input).toHaveValue('  A clearer title  ');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'This title changed elsewhere.',
    );

    await user.click(screen.getByRole('button', { name: 'Save title' }));
    expect(props.onChange).toHaveBeenCalledWith({
      title: 'A clearer title',
      titleRevision: '2026-07-24T12:00:01.000Z',
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('preserves rename input and clears pending state when the action rejects', async () => {
    const user = userEvent.setup();
    setup({
      renameItem: vi.fn().mockRejectedValue(new Error('transport failed')),
    });
    await openMenu(user);
    await user.click(screen.getByRole('menuitem', { name: 'Rename' }));
    const input = screen.getByRole('textbox', { name: 'Title' });
    await user.clear(input);
    await user.type(input, 'Preserved title');

    await user.click(screen.getByRole('button', { name: 'Save title' }));

    expect(input).toHaveValue('Preserved title');
    expect(input).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Save title' })).toBeEnabled();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'We could not update History. Try again.',
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('requires delete confirmation and removes only after success', async () => {
    const user = userEvent.setup();
    const deleteItem = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        code: 'failed',
        message: 'Deletion failed.',
      })
      .mockResolvedValueOnce({ ok: true, data: undefined });
    const props = setup({ deleteItem });

    await openMenu(user);
    await user.click(screen.getByRole('menuitem', { name: 'Delete' }));
    expect(
      screen.getByRole('dialog', { name: 'Delete saved analysis?' }),
    ).toBeInTheDocument();
    expect(deleteItem).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Delete analysis' }));
    expect(props.onDelete).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Deletion failed.');
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Delete analysis' }));
    expect(props.onDelete).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('keeps delete confirmation and clears pending state when the action rejects', async () => {
    const user = userEvent.setup();
    const props = setup({
      deleteItem: vi.fn().mockRejectedValue(new Error('transport failed')),
    });
    await openMenu(user);
    await user.click(screen.getByRole('menuitem', { name: 'Delete' }));

    await user.click(screen.getByRole('button', { name: 'Delete analysis' }));

    expect(props.onDelete).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: 'Delete analysis' }),
    ).toBeEnabled();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'We could not update History. Try again.',
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
