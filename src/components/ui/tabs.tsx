'use client';

import * as TabsPrimitive from '@radix-ui/react-tabs';
import {
  forwardRef,
  useEffect,
  useRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
} from 'react';

import { cx } from '@/lib/cx';
import { hasRenderableChildren } from '@/lib/has-renderable-children';

export interface TabsProps extends HTMLAttributes<HTMLDivElement> {
  defaultValue?: string;
  dir?: 'ltr' | 'rtl';
  onValueChange?: (value: string) => void;
  value?: string;
}

export function Tabs({ children, ...props }: TabsProps) {
  const didWarn = useRef(false);
  useEffect(() => {
    if (
      process.env.NODE_ENV !== 'production' &&
      !didWarn.current &&
      !hasRenderableChildren(children)
    ) {
      didWarn.current = true;
      console.warn(
        'Gleen Tabs must contain a TabsList and its associated tab content.',
      );
    }
  }, [children]);

  return (
    <TabsPrimitive.Root
      {...props}
      activationMode="automatic"
      orientation="horizontal"
    >
      {children}
    </TabsPrimitive.Root>
  );
}

export type TabsAccent =
  'neutral' | 'summary' | 'flashcards' | 'timestamps' | 'export';

export interface TabsListProps extends HTMLAttributes<HTMLDivElement> {
  accent?: TabsAccent;
  loop?: boolean;
}

export const TabsList = forwardRef<HTMLDivElement, TabsListProps>(
  function TabsList(
    { accent = 'neutral', children, className, ...props },
    ref,
  ) {
    const didWarn = useRef(false);
    useEffect(() => {
      if (
        process.env.NODE_ENV !== 'production' &&
        !didWarn.current &&
        !hasRenderableChildren(children)
      ) {
        didWarn.current = true;
        console.warn('Gleen TabsList must contain at least one TabsTrigger.');
      }
    }, [children]);

    return (
      <TabsPrimitive.List
        {...props}
        ref={ref}
        className={cx('ui-tabs-list', className)}
        data-accent={accent}
      >
        {children}
      </TabsPrimitive.List>
    );
  },
);

export interface TabsTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

export const TabsTrigger = forwardRef<HTMLButtonElement, TabsTriggerProps>(
  function TabsTrigger({ className, ...props }, ref) {
    return (
      <TabsPrimitive.Trigger
        {...props}
        ref={ref}
        className={cx('ui-tabs-trigger', className)}
      />
    );
  },
);

export interface TabsContentProps extends HTMLAttributes<HTMLDivElement> {
  forceMount?: true;
  value: string;
}

export const TabsContent = forwardRef<HTMLDivElement, TabsContentProps>(
  function TabsContent({ className, ...props }, ref) {
    return (
      <TabsPrimitive.Content
        {...props}
        ref={ref}
        className={cx('ui-tabs-content', className)}
      />
    );
  },
);
