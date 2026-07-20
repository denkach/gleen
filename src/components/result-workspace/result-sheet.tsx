'use client';

import { useEffect, useRef, type ReactNode, type RefObject } from 'react';

import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
import { cx } from '@/lib/cx';

export function ResultSheet({
  children,
  className,
  closeLabel,
  onOpenChange,
  open,
  responsiveFallbackRef,
  restoreFocusRef,
  title,
}: Readonly<{
  children: ReactNode;
  className?: string;
  closeLabel: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  responsiveFallbackRef?: RefObject<HTMLElement | null>;
  restoreFocusRef?: RefObject<HTMLElement | null>;
  title: string;
}>) {
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);
  useEffect(
    () => () => {
      if (!openRef.current) return;
      queueMicrotask(() => {
        const fallback = responsiveFallbackRef?.current;
        if (fallback?.isConnected) fallback.focus({ preventScroll: true });
      });
    },
    [responsiveFallbackRef],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cx('result-sheet', className)}
        title={title}
        description={title}
        data-swipe-guard
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          const target =
            restoreFocusRef?.current ?? responsiveFallbackRef?.current;
          target?.focus({ preventScroll: true });
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
