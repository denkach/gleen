'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';

import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { HistoryActionResult } from '@/lib/history/actions';
import type { HistoryItem } from '@/lib/history/repository';

export type HistoryItemActionsProps = Readonly<{
  item: HistoryItem;
  toggleFavorite(input: unknown): Promise<HistoryActionResult>;
  renameItem(
    input: unknown,
  ): Promise<HistoryActionResult<Readonly<{ updatedAt: string }>>>;
  deleteItem(input: unknown): Promise<HistoryActionResult>;
  markOpened(input: unknown): Promise<HistoryActionResult>;
  onChange(change: Partial<HistoryItem>): void;
  onDelete(): void;
  onAnnouncement(message: string): void;
}>;

function failureMessage(
  result: Exclude<HistoryActionResult<unknown>, { ok: true }>,
): string {
  return result.message;
}

const rejectedMutationMessage = 'We could not update History. Try again.';

export function HistoryItemActions({
  item,
  toggleFavorite,
  renameItem,
  deleteItem,
  markOpened,
  onChange,
  onDelete,
  onAnnouncement,
}: HistoryItemActionsProps) {
  const [optimisticFavorite, setOptimisticFavorite] = useState<boolean | null>(
    null,
  );
  const [favoritePending, setFavoritePending] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameTitle, setRenameTitle] = useState(item.title);
  const [renameError, setRenameError] = useState('');
  const [renamePending, setRenamePending] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deletePending, setDeletePending] = useState(false);

  const favorite = optimisticFavorite ?? item.favorite;

  async function changeFavorite() {
    if (favoritePending) return;
    const previous = favorite;
    const next = !previous;
    setOptimisticFavorite(next);
    setFavoritePending(true);
    try {
      const result = await toggleFavorite({
        analysisId: item.id,
        favorite: next,
      });
      if (!result.ok) {
        setOptimisticFavorite(null);
        onAnnouncement(failureMessage(result));
        return;
      }

      onChange({ favorite: next });
      setOptimisticFavorite(null);
      onAnnouncement(
        next
          ? `${item.title} added to favorites.`
          : `${item.title} removed from favorites.`,
      );
    } catch {
      setOptimisticFavorite(null);
      onAnnouncement(rejectedMutationMessage);
    } finally {
      setFavoritePending(false);
    }
  }

  function openRename() {
    setRenameTitle(item.title);
    setRenameError('');
    setRenameOpen(true);
  }

  async function submitRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (renamePending) return;
    const title = renameTitle.trim();
    if (!title) {
      setRenameError('Enter a title before saving.');
      return;
    }

    setRenamePending(true);
    setRenameError('');
    try {
      const result = await renameItem({
        analysisId: item.id,
        title,
        expectedUpdatedAt: item.titleRevision,
      });
      if (!result.ok) {
        setRenameError(failureMessage(result));
        return;
      }

      onChange({ title, titleRevision: result.data.updatedAt });
      onAnnouncement(`${title} renamed.`);
      setRenameOpen(false);
    } catch {
      setRenameError(rejectedMutationMessage);
    } finally {
      setRenamePending(false);
    }
  }

  function openDelete() {
    setDeleteError('');
    setDeleteOpen(true);
  }

  async function confirmDelete() {
    if (deletePending) return;
    setDeletePending(true);
    setDeleteError('');
    try {
      const result = await deleteItem({ analysisId: item.id });
      if (!result.ok) {
        setDeleteError(failureMessage(result));
        return;
      }

      onDelete();
      onAnnouncement(`${item.title} deleted.`);
      setDeleteOpen(false);
    } catch {
      setDeleteError(rejectedMutationMessage);
    } finally {
      setDeletePending(false);
    }
  }

  function markItemOpened() {
    void markOpened({ analysisId: item.id }).catch(() => undefined);
  }

  const openLabel =
    item.status.key === 'ready' || item.status.key === 'partial'
      ? 'Continue studying'
      : item.status.key === 'processing'
        ? 'Continue'
        : 'Open';

  return (
    <div className="history-item-actions">
      <button
        type="button"
        className="history-item-actions__favorite"
        aria-label={`${favorite ? 'Remove' : 'Add'} ${item.title} ${
          favorite ? 'from' : 'to'
        } favorites`}
        aria-pressed={favorite}
        data-selected={favorite ? 'true' : 'false'}
        disabled={favoritePending}
        onClick={() => void changeFavorite()}
      >
        <span aria-hidden="true">{favorite ? '★' : '☆'}</span>
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger
          className="history-item-actions__trigger"
          aria-label={`Actions for ${item.title}`}
        >
          <span aria-hidden="true">•••</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="history-item-actions__menu"
          align="end"
          aria-label={`Actions for ${item.title}`}
        >
          <DropdownMenuItem asChild>
            <Link href={item.href} onClick={markItemOpened}>
              {openLabel}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={openRename}>Rename</DropdownMenuItem>
          {item.canExport ? (
            <DropdownMenuItem asChild>
              <Link href={`${item.href}#export`}>Export</Link>
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="history-item-actions__delete"
            onSelect={openDelete}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent
          title="Rename saved analysis"
          description="Give this saved analysis a title that is easier to find."
          className="history-item-actions__dialog"
        >
          <form onSubmit={(event) => void submitRename(event)}>
            <label htmlFor={`history-rename-${item.id}`}>Title</label>
            <input
              id={`history-rename-${item.id}`}
              value={renameTitle}
              maxLength={300}
              disabled={renamePending}
              aria-invalid={renameError ? 'true' : undefined}
              onChange={(event) => {
                setRenameTitle(event.currentTarget.value);
                setRenameError('');
              }}
            />
            {renameError ? <p role="alert">{renameError}</p> : null}
            <div className="history-item-actions__dialog-actions">
              <DialogClose type="button" disabled={renamePending}>
                Cancel
              </DialogClose>
              <button type="submit" disabled={renamePending}>
                {renamePending ? 'Saving…' : 'Save title'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent
          title="Delete saved analysis?"
          description={`Delete ${item.title} from your history. This cannot be undone.`}
          className="history-item-actions__dialog"
        >
          {deleteError ? <p role="alert">{deleteError}</p> : null}
          <div className="history-item-actions__dialog-actions">
            <DialogClose type="button" disabled={deletePending}>
              Cancel
            </DialogClose>
            <button
              type="button"
              disabled={deletePending}
              onClick={() => void confirmDelete()}
            >
              {deletePending ? 'Deleting…' : 'Delete analysis'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
