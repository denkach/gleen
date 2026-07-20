'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  forwardRef,
  useEffect,
  useRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
  type RefObject,
} from 'react';

import { cx } from '@/lib/cx';

export interface DialogProps {
  children?: ReactNode;
  defaultOpen?: boolean;
  modal?: boolean;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
}

export function Dialog(props: DialogProps) {
  return <DialogPrimitive.Root {...props} />;
}

export interface DialogTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export const DialogTrigger = forwardRef<HTMLButtonElement, DialogTriggerProps>(
  function DialogTrigger(props, ref) {
    return <DialogPrimitive.Trigger {...props} ref={ref} />;
  },
);

export interface DialogCloseProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export const DialogClose = forwardRef<HTMLButtonElement, DialogCloseProps>(
  function DialogClose(props, ref) {
    return <DialogPrimitive.Close {...props} ref={ref} />;
  },
);

export interface DialogTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  asChild?: boolean;
}

export const DialogTitle = forwardRef<HTMLHeadingElement, DialogTitleProps>(
  function DialogTitle(props, ref) {
    return <DialogPrimitive.Title {...props} ref={ref} />;
  },
);

export interface DialogDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {
  asChild?: boolean;
}

export const DialogDescription = forwardRef<
  HTMLParagraphElement,
  DialogDescriptionProps
>(function DialogDescription(props, ref) {
  return <DialogPrimitive.Description {...props} ref={ref} />;
});

export interface DialogContentProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'children' | 'title'
> {
  title: string;
  description?: string;
  children: ReactNode;
  closeLabel?: string;
  initialFocusRef?: RefObject<HTMLElement | null>;
  onEscapeKeyDown?: (event: KeyboardEvent) => void;
  onCloseAutoFocus?: (event: Event) => void;
  onInteractOutside?: (event: Event) => void;
  onPointerDownOutside?: (event: Event) => void;
}

const missingDescriptionWarning =
  'Gleen DialogContent requires a description or an aria-describedby value that resolves to mounted content.';

export const DialogContent = forwardRef<HTMLDivElement, DialogContentProps>(
  function DialogContent(
    {
      'aria-describedby': ariaDescribedBy,
      children,
      className,
      closeLabel = 'Close dialog',
      description,
      initialFocusRef,
      title,
      ...props
    },
    forwardedRef,
  ) {
    const didWarn = useRef(false);
    useEffect(() => {
      if (
        process.env.NODE_ENV === 'production' ||
        description ||
        didWarn.current
      )
        return;
      const ids = ariaDescribedBy?.trim().split(/\s+/).filter(Boolean) ?? [];
      if (ids.length === 0 || ids.some((id) => !document.getElementById(id))) {
        didWarn.current = true;
        console.warn(missingDescriptionWarning);
      }
    }, [ariaDescribedBy, description]);

    const descriptionAttributes =
      description && ariaDescribedBy === undefined
        ? {}
        : { 'aria-describedby': ariaDescribedBy };

    return (
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="ui-dialog-overlay" />
        <DialogPrimitive.Content
          {...props}
          {...descriptionAttributes}
          ref={forwardedRef}
          className={cx('ui-dialog-content', className)}
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
            <DialogPrimitive.Description className="ui-dialog-description">
              {description}
            </DialogPrimitive.Description>
          ) : null}
          <div className="ui-dialog-body">{children}</div>
          <DialogPrimitive.Close
            className="ui-dialog-close"
            aria-label={closeLabel}
          >
            <span aria-hidden="true">×</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    );
  },
);
