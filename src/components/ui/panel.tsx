import { forwardRef, type HTMLAttributes } from 'react';

import { cx } from '@/lib/cx';

export interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  surface?: 'panel' | 'raised';
  padding?: 'sm' | 'md' | 'lg';
}

export const Panel = forwardRef<HTMLDivElement, PanelProps>(function Panel(
  { className, padding = 'md', surface = 'panel', ...props },
  ref,
) {
  return (
    <div
      {...props}
      ref={ref}
      className={cx('ui-panel', className)}
      data-padding={padding}
      data-surface={surface}
    />
  );
});
