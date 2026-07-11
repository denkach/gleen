import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';

import { cx } from '@/lib/cx';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
  leadingIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    'aria-describedby': ariaDescribedBy,
    'aria-invalid': ariaInvalid,
    className,
    error,
    hint,
    id,
    label,
    leadingIcon,
    ...props
  },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? `${generatedId}-field`;
  const hintId = hint ? `${generatedId}-hint` : undefined;
  const errorId = error ? `${generatedId}-error` : undefined;
  const describedBy = [ariaDescribedBy, hintId, errorId]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="ui-input">
      <label className="ui-input__label" htmlFor={inputId}>
        {label}
      </label>
      <div className="ui-input__control">
        {leadingIcon ? (
          <span className="ui-input__icon" aria-hidden="true">
            {leadingIcon}
          </span>
        ) : null}
        <input
          {...props}
          ref={ref}
          id={inputId}
          className={cx('ui-input-field', className)}
          data-leading-icon={leadingIcon ? '' : undefined}
          aria-describedby={describedBy || undefined}
          aria-invalid={error ? true : ariaInvalid}
        />
      </div>
      {hint ? (
        <span className="ui-input__hint" id={hintId}>
          {hint}
        </span>
      ) : null}
      {error ? (
        <span className="ui-input__error" id={errorId}>
          {error}
        </span>
      ) : null}
    </div>
  );
});
