'use client';

import { useActionState, useEffect } from 'react';

import {
  sendPasswordReset,
  updatePassword,
  type AuthActionState,
} from '@/lib/auth/actions';

import { AuthStatus } from './auth-status';
import { PasswordFields } from './password-fields';

const initialState: AuthActionState = { status: 'idle' };

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(
    sendPasswordReset,
    initialState,
  );

  return (
    <form action={action}>
      <div className="form-group">
        <label className="form-label" htmlFor="recovery-email">
          Email address
        </label>
        <input
          className="input"
          id="recovery-email"
          name="email"
          type="email"
          defaultValue={state.email}
          autoComplete="email"
          required
        />
      </div>
      <button
        className="btn btn-primary auth-submit"
        type="submit"
        disabled={pending}
      >
        {pending ? 'Sending…' : 'Send reset link'}{' '}
        <span aria-hidden="true">→</span>
      </button>
      {state.message ? (
        <AuthStatus tone={state.status === 'error' ? 'error' : 'success'}>
          {state.message}
        </AuthStatus>
      ) : null}
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, initialState);

  useEffect(() => {
    if (state.redirectTo) window.location.assign(state.redirectTo);
  }, [state.redirectTo]);

  return (
    <form action={action}>
      <PasswordFields confirm />
      <button
        className="btn btn-primary auth-submit"
        type="submit"
        disabled={pending}
      >
        {pending ? 'Updating…' : 'Update password'}{' '}
        <span aria-hidden="true">→</span>
      </button>
      {state.message ? (
        <AuthStatus tone={state.status === 'error' ? 'error' : 'success'}>
          {state.message}
        </AuthStatus>
      ) : null}
    </form>
  );
}
