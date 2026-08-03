import type { AuthCopy } from '@/lib/i18n/messages/auth';

type PasswordFieldsProps = Readonly<{
  confirm?: boolean;
  copy: AuthCopy['password'];
}>;

export function PasswordFields({ confirm = false, copy }: PasswordFieldsProps) {
  return (
    <>
      <div className="form-group">
        <label className="form-label" htmlFor="password">
          {copy.label}
        </label>
        <input
          className="input"
          id="password"
          name="password"
          type="password"
          minLength={8}
          autoComplete={confirm ? 'new-password' : 'current-password'}
          required
        />
      </div>
      {confirm ? (
        <div className="form-group">
          <label className="form-label" htmlFor="confirmPassword">
            {copy.confirmLabel}
          </label>
          <input
            className="input"
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            minLength={8}
            autoComplete="new-password"
            required
          />
        </div>
      ) : null}
    </>
  );
}
