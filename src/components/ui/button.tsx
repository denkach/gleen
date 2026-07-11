import { forwardRef, type ButtonHTMLAttributes } from 'react';

import { cx } from '@/lib/cx';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'soft' | 'danger';
  size?: 'sm' | 'default' | 'icon';
  loading?: boolean;
  loadingLabel?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledBy,
      children,
      className,
      disabled,
      loading = false,
      loadingLabel = 'Loading',
      size = 'default',
      type = 'button',
      variant = 'primary',
      ...props
    },
    ref,
  ) {
    return (
      <button
        {...props}
        ref={ref}
        type={type}
        className={cx('ui-button', className)}
        data-size={size}
        data-variant={variant}
        data-loading={loading || undefined}
        disabled={disabled || loading}
        aria-label={loading ? loadingLabel : ariaLabel}
        aria-labelledby={loading ? undefined : ariaLabelledBy}
      >
        <span className="ui-button__content" aria-hidden={loading || undefined}>
          {children}
        </span>
        {loading ? (
          <span className="ui-button__loading" aria-hidden="true" />
        ) : null}
      </button>
    );
  },
);
