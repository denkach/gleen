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
import type { HistoryMessages } from '@/lib/i18n/messages/history';
import type { HistoryItem } from '@/lib/history/repository';

export type HistoryItemActionsProps = Readonly<{
  item: HistoryItem;
  copy: HistoryMessages;
  toggleFavorite(input: unknown): Promise<HistoryActionResult>;
  renameItem(
    input: unknown,
  ): Promise<HistoryActionResult<Readonly<{ updatedAt: string }>>>;
  deleteItem(input: unknown): Promise<HistoryActionResult>;
  markOpened(input: unknown): Promise<HistoryActionResult>;
  onChange(change: Partial<HistoryItem>): void;
  onDelete(): void;
  onAnnouncement(message: string): void;
  initialDialog?: 'rename' | 'delete' | null;
}>;

function failureMessage(
  copy: HistoryMessages,
  result: Exclude<HistoryActionResult<unknown>, { ok: true }>,
): string {
  return copy.errors[result.code];
}

export function HistoryItemActions({
  item,
  copy,
  toggleFavorite,
  renameItem,
  deleteItem,
  markOpened,
  onChange,
  onDelete,
  onAnnouncement,
  initialDialog = null,
}: HistoryItemActionsProps) {
  const [optimisticFavorite, setOptimisticFavorite] = useState<boolean | null>(
    null,
  );
  const [favoritePending, setFavoritePending] = useState(false);
  const [renameOpen, setRenameOpen] = useState(initialDialog === 'rename');
  const [renameTitle, setRenameTitle] = useState(item.title);
  const [renameError, setRenameError] = useState('');
  const [renamePending, setRenamePending] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(initialDialog === 'delete');
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
        onAnnouncement(failureMessage(copy, result));
        return;
      }

      onChange({ favorite: next });
      setOptimisticFavorite(null);
      onAnnouncement(
        next
          ? copy.toasts.favoriteAdded(item.title)
          : copy.toasts.favoriteRemoved(item.title),
      );
    } catch {
      setOptimisticFavorite(null);
      onAnnouncement(copy.errors.failed);
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
      setRenameError(copy.actions.rename.empty);
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
        setRenameError(failureMessage(copy, result));
        return;
      }

      onChange({ title, titleRevision: result.data.updatedAt });
      onAnnouncement(copy.toasts.renamed(title));
      setRenameOpen(false);
    } catch {
      setRenameError(copy.errors.failed);
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
        setDeleteError(failureMessage(copy, result));
        return;
      }

      onDelete();
      onAnnouncement(copy.toasts.deleted(item.title));
      setDeleteOpen(false);
    } catch {
      setDeleteError(copy.errors.failed);
    } finally {
      setDeletePending(false);
    }
  }

  function markItemOpened() {
    if (item.status.key !== 'ready' && item.status.key !== 'partial') return;
    void markOpened({ analysisId: item.id }).catch(() => undefined);
  }

  const openLabel =
    item.status.key === 'ready' || item.status.key === 'partial'
      ? copy.actions.open
      : copy.actions.continue;

  return (
    <div className="history-item-actions">
      <button
        type="button"
        className="history-item-actions__favorite"
        aria-label={
          favorite
            ? copy.actions.favorite.removeLabel(item.title)
            : copy.actions.favorite.addLabel(item.title)
        }
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
          aria-label={copy.actions.menuLabel(item.title)}
        >
          <span aria-hidden="true">•••</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="history-item-actions__menu"
          align="end"
          aria-label={copy.actions.menuLabel(item.title)}
        >
          <DropdownMenuItem asChild>
            <Link href={item.href} onClick={markItemOpened}>
              {openLabel}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={openRename}>
            {copy.actions.rename.action}
          </DropdownMenuItem>
          {item.canExport ? (
            <DropdownMenuItem asChild>
              <Link href={`${item.href}#export`}>{copy.actions.export}</Link>
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="history-item-actions__delete"
            onSelect={openDelete}
          >
            {copy.actions.delete.action}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent
          title={copy.actions.rename.title}
          description={copy.actions.rename.description}
          closeLabel={copy.actions.closeDialog}
          className="history-item-actions__dialog"
        >
          <form onSubmit={(event) => void submitRename(event)}>
            <label htmlFor={`history-rename-${item.id}`}>
              {copy.actions.rename.field}
            </label>
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
                {copy.actions.rename.cancel}
              </DialogClose>
              <button type="submit" disabled={renamePending}>
                {renamePending
                  ? copy.actions.rename.saving
                  : copy.actions.rename.save}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent
          title={copy.actions.delete.title}
          description={copy.actions.delete.description(item.title)}
          closeLabel={copy.actions.closeDialog}
          className="history-item-actions__dialog"
        >
          {deleteError ? <p role="alert">{deleteError}</p> : null}
          <div className="history-item-actions__dialog-actions">
            <DialogClose type="button" disabled={deletePending}>
              {copy.actions.delete.cancel}
            </DialogClose>
            <button
              type="button"
              disabled={deletePending}
              onClick={() => void confirmDelete()}
            >
              {deletePending
                ? copy.actions.delete.deleting
                : copy.actions.delete.confirm}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
