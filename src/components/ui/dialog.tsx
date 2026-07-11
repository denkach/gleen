'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ComponentRef,
  type ReactNode,
  type RefObject,
  useId,
} from 'react';

import { cx } from '@/lib/cx';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export const DialogTitle = DialogPrimitive.Title;
export const DialogDescription = DialogPrimitive.Description;

export interface DialogContentProps extends Omit<
  ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
  'children' | 'onOpenAutoFocus' | 'title'
> {
  title: string;
  description?: string;
  children: ReactNode;
  initialFocusRef?: RefObject<HTMLElement | null>;
}

export const DialogContent = forwardRef<
  ComponentRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(function DialogContent(
  {
    'aria-describedby': ariaDescribedBy,
    children,
    className,
    description,
    initialFocusRef,
    title,
    ...props
  },
  ref,
) {
  const descriptionId = useId();
  const composedDescription = description
    ? [descriptionId, ariaDescribedBy].filter(Boolean).join(' ')
    : ariaDescribedBy;

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="ui-dialog-overlay" />
      <DialogPrimitive.Content
        {...props}
        ref={ref}
        className={cx('ui-dialog-content', className)}
        aria-describedby={composedDescription}
        onOpenAutoFocus={(event) => {
          if (initialFocusRef?.current) {
            event.preventDefault();
            initialFocusRef.current.focus();
          }
        }}
      >
        <DialogPrimitive.Title className="ui-dialog-title">
          {title}
        </DialogPrimitive.Title>
        {description ? (
          <DialogPrimitive.Description
            id={descriptionId}
            className="ui-dialog-description"
          >
            {description}
          </DialogPrimitive.Description>
        ) : null}
        <div className="ui-dialog-body">{children}</div>
        <DialogPrimitive.Close
          className="ui-dialog-close"
          aria-label="Close dialog"
        >
          <span aria-hidden="true">×</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
});
