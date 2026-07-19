'use client';

import type { ReactNode, RefObject } from 'react';

import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
import { cx } from '@/lib/cx';

export function ResultSheet({
  children,
  className,
  closeLabel,
  onOpenChange,
  open,
  restoreFocusRef,
  title,
}: Readonly<{
  children: ReactNode;
  className?: string;
  closeLabel: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  restoreFocusRef?: RefObject<HTMLElement | null>;
  title: string;
}>) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cx('result-sheet', className)}
        title={title}
        description={title}
        data-swipe-guard
        onCloseAutoFocus={(event) => {
          if (!restoreFocusRef?.current) return;
          event.preventDefault();
          restoreFocusRef.current.focus();
        }}
      >
        <span className="result-sheet-handle" aria-hidden="true" />
        <div className="result-sheet-content">{children}</div>
        <DialogClose className="result-sheet-close" type="button">
          {closeLabel}
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
