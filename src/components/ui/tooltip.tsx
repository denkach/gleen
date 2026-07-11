'use client';

import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ComponentRef,
} from 'react';

import { cx } from '@/lib/cx';

export function TooltipProvider({
  children,
}: Pick<
  ComponentPropsWithoutRef<typeof TooltipPrimitive.Provider>,
  'children'
>) {
  return (
    <TooltipPrimitive.Provider delayDuration={350} skipDelayDuration={150}>
      {children}
    </TooltipPrimitive.Provider>
  );
}

export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export interface TooltipContentProps extends Omit<
  ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>,
  'side'
> {
  side?: 'top' | 'right' | 'bottom' | 'left';
}

export const TooltipContent = forwardRef<
  ComponentRef<typeof TooltipPrimitive.Content>,
  TooltipContentProps
>(function TooltipContent(
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
});
