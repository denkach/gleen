'use client';

import Link from 'next/link';
import { useActionState, useEffect, useState } from 'react';

import {
  sendMagicLink,
  signInWithGoogle,
  signInWithPassword,
  signUpWithPassword,
  type AuthActionState,
} from '@/lib/auth/actions';

import { AuthStatus } from './auth-status';
import { PasswordFields } from './password-fields';

const initialState: AuthActionState = { status: 'idle' };

type AccessFormProps = Readonly<{
  intent: 'sign-in' | 'sign-up';
}>;

export function AccessForm({ intent }: AccessFormProps) {
  const [mode, setMode] = useState<'link' | 'password'>('link');
  const passwordAction =
    intent === 'sign-in' ? signInWithPassword : signUpWithPassword;
  const [emailState, emailFormAction, emailPending] = useActionState(
    mode === 'link' ? sendMagicLink : passwordAction,
    initialState,
  );
  const [googleState, googleFormAction, googlePending] = useActionState(
    signInWithGoogle,
    initialState,
  );
  const state =
    googleState.status === 'error' || googleState.redirectTo
      ? googleState
      : emailState;

  useEffect(() => {
    if (state.redirectTo) window.location.assign(state.redirectTo);
  }, [state.redirectTo]);

  const isSignIn = intent === 'sign-in';
  const submitLabel =
    mode === 'password'
      ? isSignIn
        ? 'Sign in with password'
        : 'Create account with password'
      : isSignIn
        ? 'Send secure sign-in link'
        : 'Create account with email';

  return (
    <>
      <span className="eyebrow">Secure access</span>
      <h2>{isSignIn ? 'Sign in to Gleen' : 'Create your account'}</h2>
      <p>
        {isSignIn
          ? 'Continue with Google or receive a secure link by email.'
          : 'Start with Google or create an account using your email.'}
      </p>
      <form action={googleFormAction}>
        <input type="hidden" name="next" value="/onboarding" />
        <button
          className="btn oauth-btn"
          type="submit"
          disabled={googlePending}
        >
          <span className="oauth-icon" aria-hidden="true">
            G
          </span>
          <span>{googlePending ? 'Connecting…' : 'Continue with Google'}</span>
        </button>
      </form>
      <div className="auth-divider">OR USE EMAIL</div>
      <form action={emailFormAction}>
        <input type="hidden" name="intent" value={intent} />
        <input type="hidden" name="next" value="/onboarding" />
        <div className="form-group">
          <label className="form-label" htmlFor={`${intent}-email`}>
            Email address
          </label>
          <div className="input-wrap">
            <span className="input-icon" aria-hidden="true">
              @
            </span>
            <input
              className="input with-icon"
              id={`${intent}-email`}
              name="email"
              type="email"
              defaultValue={emailState.email}
              autoComplete="email"
              required
            />
          </div>
        </div>
        {mode === 'password' ? <PasswordFields /> : null}
        <button
          className="btn btn-primary auth-submit"
          type="submit"
          disabled={emailPending}
        >
          <span>{emailPending ? 'Please wait…' : submitLabel}</span>
          <span aria-hidden="true">→</span>
        </button>
      </form>
      {state.message ? (
        <AuthStatus tone={state.status === 'error' ? 'error' : 'success'}>
          {state.message}
        </AuthStatus>
      ) : null}
      <div className="form-row">
        <span>
          {mode === 'link' ? 'Prefer a password?' : 'Prefer a secure link?'}
        </span>
        <button
          className="text-action"
          type="button"
          onClick={() => setMode(mode === 'link' ? 'password' : 'link')}
        >
          {mode === 'link' ? 'Use password instead' : 'Use email link instead'}
        </button>
      </div>
      {mode === 'password' && isSignIn ? (
        <p className="auth-footer">
          <Link href="/forgot-password">Forgot your password?</Link>
        </p>
      ) : null}
      <p className="auth-footer">
        {isSignIn ? 'New to Gleen? ' : 'Already have an account? '}
        <Link href={isSignIn ? '/sign-up' : '/sign-in'}>
          {isSignIn ? 'Create an account' : 'Sign in'}
        </Link>
      </p>
      <p className="auth-footer">
        By continuing, you agree to the <Link href="/terms">Terms</Link> and
        acknowledge the <Link href="/privacy">Privacy Policy</Link>.
      </p>
    </>
  );
}
