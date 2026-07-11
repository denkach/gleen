'use client';

import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import {
  forwardRef,
  useEffect,
  useRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from 'react';

import { cx } from '@/lib/cx';
import { hasRenderableChildren } from '@/lib/has-renderable-children';

export interface DropdownMenuProps {
  children?: ReactNode;
  defaultOpen?: boolean;
  dir?: 'ltr' | 'rtl';
  modal?: boolean;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
}

export function DropdownMenu(props: DropdownMenuProps) {
  return <DropdownMenuPrimitive.Root {...props} />;
}

export interface DropdownMenuTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export const DropdownMenuTrigger = forwardRef<
  HTMLButtonElement,
  DropdownMenuTriggerProps
>(function DropdownMenuTrigger({ className, ...props }, ref) {
  return (
    <DropdownMenuPrimitive.Trigger
      {...props}
      ref={ref}
      className={cx('ui-dropdown-menu-trigger', className)}
    />
  );
});

export interface DropdownMenuContentProps extends HTMLAttributes<HTMLDivElement> {
  align?: 'start' | 'center' | 'end';
  alignOffset?: number;
  avoidCollisions?: boolean;
  loop?: boolean;
  side?: 'top' | 'right' | 'bottom' | 'left';
  sideOffset?: number;
}

export const DropdownMenuContent = forwardRef<
  HTMLDivElement,
  DropdownMenuContentProps
>(function DropdownMenuContent({ children, className, ...props }, ref) {
  const didWarn = useRef(false);
  useEffect(() => {
    if (
      process.env.NODE_ENV !== 'production' &&
      !didWarn.current &&
      !hasRenderableChildren(children)
    ) {
      didWarn.current = true;
      console.warn(
        'Gleen DropdownMenuContent must contain at least one menu part.',
      );
    }
  }, [children]);

  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        {...props}
        ref={ref}
        className={cx('ui-dropdown-menu-content', className)}
      >
        {children}
      </DropdownMenuPrimitive.Content>
    </DropdownMenuPrimitive.Portal>
  );
});

export interface DropdownMenuLabelProps extends HTMLAttributes<HTMLDivElement> {
  asChild?: boolean;
}

export const DropdownMenuLabel = forwardRef<
  HTMLDivElement,
  DropdownMenuLabelProps
>(function DropdownMenuLabel({ className, ...props }, ref) {
  return (
    <DropdownMenuPrimitive.Label
      {...props}
      ref={ref}
      className={cx('ui-dropdown-menu-label', className)}
    />
  );
});

export interface DropdownMenuItemProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'onSelect'
> {
  asChild?: boolean;
  disabled?: boolean;
  onSelect?: (event: Event) => void;
  textValue?: string;
}

export const DropdownMenuItem = forwardRef<
  HTMLDivElement,
  DropdownMenuItemProps
>(function DropdownMenuItem({ className, ...props }, ref) {
  return (
    <DropdownMenuPrimitive.Item
      {...props}
      ref={ref}
      className={cx('ui-dropdown-menu-item', className)}
    />
  );
});

export interface DropdownMenuCheckboxItemProps extends DropdownMenuItemProps {
  checked?: boolean | 'indeterminate';
  onCheckedChange?: (checked: boolean) => void;
}

export const DropdownMenuCheckboxItem = forwardRef<
  HTMLDivElement,
  DropdownMenuCheckboxItemProps
>(function DropdownMenuCheckboxItem({ children, className, ...props }, ref) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      {...props}
      ref={ref}
      className={cx(
        'ui-dropdown-menu-item ui-dropdown-menu-checkbox-item',
        className,
      )}
    >
      <DropdownMenuPrimitive.ItemIndicator className="ui-dropdown-menu-item-indicator">
        <span aria-hidden="true">✓</span>
      </DropdownMenuPrimitive.ItemIndicator>
      <span>{children}</span>
    </DropdownMenuPrimitive.CheckboxItem>
  );
});

export interface DropdownMenuSeparatorProps extends HTMLAttributes<HTMLDivElement> {
  decorative?: boolean;
}

export const DropdownMenuSeparator = forwardRef<
  HTMLDivElement,
  DropdownMenuSeparatorProps
>(function DropdownMenuSeparator({ className, ...props }, ref) {
  return (
    <DropdownMenuPrimitive.Separator
      {...props}
      ref={ref}
      className={cx('ui-dropdown-menu-separator', className)}
    />
  );
});
