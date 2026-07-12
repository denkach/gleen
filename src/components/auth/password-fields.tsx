type PasswordFieldsProps = Readonly<{
  confirm?: boolean;
}>;

export function PasswordFields({ confirm = false }: PasswordFieldsProps) {
  return (
    <>
      <div className="form-group">
        <label className="form-label" htmlFor="password">
          Password
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
            Confirm password
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
