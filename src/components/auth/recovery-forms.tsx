'use client';

import { useActionState, useEffect } from 'react';

import {
  sendPasswordReset,
  updatePassword,
  type AuthActionState,
} from '@/lib/auth/actions';
import {
  authErrorMessage,
  authSuccessMessage,
  isAuthSuccessCode,
  type AuthCopy,
} from '@/lib/i18n/messages/auth';

import { AuthStatus } from './auth-status';
import { PasswordFields } from './password-fields';

const initialState: AuthActionState = { status: 'idle' };

type RecoveryFormProps = Readonly<{ copy: AuthCopy }>;

function statusMessage(copy: AuthCopy, state: AuthActionState): string | null {
  if (state.status === 'error') return authErrorMessage(copy, state.code);
  if (state.status === 'success' && isAuthSuccessCode(state.code))
    return authSuccessMessage(copy, state.code);
  return null;
}

export function ForgotPasswordForm({ copy }: RecoveryFormProps) {
  const [state, action, pending] = useActionState(
    sendPasswordReset,
    initialState,
  );
  const message = statusMessage(copy, state);

  return (
    <form action={action}>
      <div className="form-group">
        <label className="form-label" htmlFor="recovery-email">
          {copy.screens.forgot.emailLabel}
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
        {pending ? copy.screens.forgot.sending : copy.screens.forgot.submit}{' '}
        <span aria-hidden="true">→</span>
      </button>
      {message ? (
        <AuthStatus tone={state.status === 'error' ? 'error' : 'success'}>
          {message}
        </AuthStatus>
      ) : null}
    </form>
  );
}

export function ResetPasswordForm({ copy }: RecoveryFormProps) {
  const [state, action, pending] = useActionState(updatePassword, initialState);
  const message = statusMessage(copy, state);

  useEffect(() => {
    if (state.redirectTo) window.location.assign(state.redirectTo);
  }, [state.redirectTo]);

  return (
    <form action={action}>
      <PasswordFields confirm copy={copy.password} />
      <button
        className="btn btn-primary auth-submit"
        type="submit"
        disabled={pending}
      >
        {pending ? copy.screens.reset.updating : copy.screens.reset.submit}{' '}
        <span aria-hidden="true">→</span>
      </button>
      {message ? (
        <AuthStatus tone={state.status === 'error' ? 'error' : 'success'}>
          {message}
        </AuthStatus>
      ) : null}
    </form>
  );
}
