'use client';

import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ComponentRef,
} from 'react';

import { cx } from '@/lib/cx';

export function DropdownMenu(
  props: ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Root>,
) {
  return <DropdownMenuPrimitive.Root {...props} />;
}

export const DropdownMenuTrigger = forwardRef<
  ComponentRef<typeof DropdownMenuPrimitive.Trigger>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Trigger>
>(function DropdownMenuTrigger({ className, ...props }, ref) {
  return (
    <DropdownMenuPrimitive.Trigger
      {...props}
      ref={ref}
      className={cx('ui-dropdown-menu-trigger', className)}
    />
  );
});

export const DropdownMenuContent = forwardRef<
  ComponentRef<typeof DropdownMenuPrimitive.Content>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(function DropdownMenuContent({ className, ...props }, ref) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        {...props}
        ref={ref}
        className={cx('ui-dropdown-menu-content', className)}
      />
    </DropdownMenuPrimitive.Portal>
  );
});

export const DropdownMenuLabel = forwardRef<
  ComponentRef<typeof DropdownMenuPrimitive.Label>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label>
>(function DropdownMenuLabel({ className, ...props }, ref) {
  return (
    <DropdownMenuPrimitive.Label
      {...props}
      ref={ref}
      className={cx('ui-dropdown-menu-label', className)}
    />
  );
});

export const DropdownMenuItem = forwardRef<
  ComponentRef<typeof DropdownMenuPrimitive.Item>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item>
>(function DropdownMenuItem({ className, ...props }, ref) {
  return (
    <DropdownMenuPrimitive.Item
      {...props}
      ref={ref}
      className={cx('ui-dropdown-menu-item', className)}
    />
  );
});

export const DropdownMenuCheckboxItem = forwardRef<
  ComponentRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
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

export const DropdownMenuSeparator = forwardRef<
  ComponentRef<typeof DropdownMenuPrimitive.Separator>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(function DropdownMenuSeparator({ className, ...props }, ref) {
  return (
    <DropdownMenuPrimitive.Separator
      {...props}
      ref={ref}
      className={cx('ui-dropdown-menu-separator', className)}
    />
  );
});
