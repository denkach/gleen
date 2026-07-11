import { forwardRef, type HTMLAttributes } from 'react';

import { cx } from '@/lib/cx';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  shape?: 'rect' | 'text';
  lines?: number;
}

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  function Skeleton({ className, lines = 1, shape = 'rect', ...props }, ref) {
    const lineCount = Number.isFinite(lines)
      ? Math.max(1, Math.floor(lines))
      : 1;

    return (
      <div
        {...props}
        ref={ref}
        className={cx('ui-skeleton', className)}
        data-shape={shape}
        aria-hidden="true"
      >
        {shape === 'text'
          ? Array.from({ length: lineCount }, (_, index) => (
              <span
                className="ui-skeleton__line"
                data-testid="skeleton-line"
                key={index}
              />
            ))
          : null}
      </div>
    );
  },
);
