'use client';

import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import {
  forwardRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from 'react';

import { cx } from '@/lib/cx';

export interface TooltipProviderProps {
  children?: ReactNode;
}

export function TooltipProvider({ children }: TooltipProviderProps) {
  return (
    <TooltipPrimitive.Provider delayDuration={350} skipDelayDuration={150}>
      {children}
    </TooltipPrimitive.Provider>
  );
}

export interface TooltipProps {
  children?: ReactNode;
  defaultOpen?: boolean;
  delayDuration?: number;
  disableHoverableContent?: boolean;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
}

export function Tooltip(props: TooltipProps) {
  return <TooltipPrimitive.Root {...props} />;
}

export interface TooltipTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export const TooltipTrigger = forwardRef<
  HTMLButtonElement,
  TooltipTriggerProps
>(function TooltipTrigger(props, ref) {
  return <TooltipPrimitive.Trigger {...props} ref={ref} />;
});

export interface TooltipContentProps extends HTMLAttributes<HTMLDivElement> {
  align?: 'start' | 'center' | 'end';
  alignOffset?: number;
  avoidCollisions?: boolean;
  side?: 'top' | 'right' | 'bottom' | 'left';
  sideOffset?: number;
}

export const TooltipContent = forwardRef<HTMLDivElement, TooltipContentProps>(
  function TooltipContent(
    { children, className, side = 'top', ...props },
    ref,
  ) {
    return (
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          {...props}
          ref={ref}
          className={cx('ui-tooltip-content', className)}
          side={side}
        >
          {children}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    );
  },
);
