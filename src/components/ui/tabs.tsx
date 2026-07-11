'use client';

import * as TabsPrimitive from '@radix-ui/react-tabs';
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ComponentRef,
} from 'react';

import { cx } from '@/lib/cx';

export type TabsProps = Omit<
  ComponentPropsWithoutRef<typeof TabsPrimitive.Root>,
  'activationMode' | 'orientation'
>;

export function Tabs(props: TabsProps) {
  return (
    <TabsPrimitive.Root
      {...props}
      activationMode="automatic"
      orientation="horizontal"
    />
  );
}

type TabsAccent =
  'neutral' | 'summary' | 'flashcards' | 'timestamps' | 'export';

export interface TabsListProps extends ComponentPropsWithoutRef<
  typeof TabsPrimitive.List
> {
  accent?: TabsAccent;
}

export const TabsList = forwardRef<
  ComponentRef<typeof TabsPrimitive.List>,
  TabsListProps
>(function TabsList({ accent = 'neutral', className, ...props }, ref) {
  return (
    <TabsPrimitive.List
      {...props}
      ref={ref}
      className={cx('ui-tabs-list', className)}
      data-accent={accent}
    />
  );
});

export const TabsTrigger = forwardRef<
  ComponentRef<typeof TabsPrimitive.Trigger>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(function TabsTrigger({ className, ...props }, ref) {
  return (
    <TabsPrimitive.Trigger
      {...props}
      ref={ref}
      className={cx('ui-tabs-trigger', className)}
    />
  );
});

export const TabsContent = forwardRef<
  ComponentRef<typeof TabsPrimitive.Content>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(function TabsContent({ className, ...props }, ref) {
  return (
    <TabsPrimitive.Content
      {...props}
      ref={ref}
      className={cx('ui-tabs-content', className)}
    />
  );
});
