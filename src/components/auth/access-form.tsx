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
import {
  authErrorMessage,
  authSuccessMessage,
  isAuthSuccessCode,
  type AuthCopy,
} from '@/lib/i18n/messages/auth';

import { AuthStatus } from './auth-status';
import { PasswordFields } from './password-fields';

const initialState: AuthActionState = { status: 'idle' };

type AccessFormProps = Readonly<{
  intent: 'sign-in' | 'sign-up';
  copy: AuthCopy;
  nextPath?: string;
}>;

export function AccessForm({
  intent,
  copy,
  nextPath = '/onboarding',
}: AccessFormProps) {
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
  const alternatePath = `${isSignIn ? '/sign-up' : '/sign-in'}?next=${encodeURIComponent(nextPath)}`;
  const submitLabel =
    mode === 'password'
      ? isSignIn
        ? copy.access.signInPassword
        : copy.access.createPassword
      : isSignIn
        ? copy.access.sendSignInLink
        : copy.access.createWithEmail;
  const statusMessage =
    state.status === 'error'
      ? authErrorMessage(copy, state.code)
      : state.status === 'success' && isAuthSuccessCode(state.code)
        ? authSuccessMessage(copy, state.code)
        : null;

  return (
    <>
      <span className="eyebrow">{copy.access.eyebrow}</span>
      <h2>{isSignIn ? copy.access.signInTitle : copy.access.signUpTitle}</h2>
      <p>
        {isSignIn
          ? copy.access.signInDescription
          : copy.access.signUpDescription}
      </p>
      <form action={googleFormAction}>
        <input type="hidden" name="next" value={nextPath} />
        <button
          className="btn oauth-btn"
          type="submit"
          disabled={googlePending}
        >
          <span className="oauth-icon" aria-hidden="true">
            G
          </span>
          <span>
            {googlePending
              ? copy.access.connectingGoogle
              : copy.access.continueGoogle}
          </span>
        </button>
      </form>
      <div className="auth-divider">{copy.access.emailDivider}</div>
      <form action={emailFormAction}>
        <input type="hidden" name="intent" value={intent} />
        <input type="hidden" name="next" value={nextPath} />
        <div className="form-group">
          <label className="form-label" htmlFor={`${intent}-email`}>
            {copy.access.emailLabel}
          </label>
          <div className="input-wrap">
            <span className="input-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M4 6.5h16v11H4z" />
                <path d="m4.5 7 7.5 6 7.5-6" />
              </svg>
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
        {mode === 'password' ? <PasswordFields copy={copy.password} /> : null}
        <button
          className="btn btn-primary auth-submit"
          type="submit"
          disabled={emailPending}
        >
          <span>{emailPending ? copy.access.pending : submitLabel}</span>
          <span aria-hidden="true">→</span>
        </button>
      </form>
      {statusMessage ? (
        <AuthStatus tone={state.status === 'error' ? 'error' : 'success'}>
          {statusMessage}
        </AuthStatus>
      ) : null}
      <div className="form-row">
        <span>
          {mode === 'link'
            ? copy.access.preferPassword
            : copy.access.preferLink}
        </span>
        <button
          className="text-action"
          type="button"
          onClick={() => setMode(mode === 'link' ? 'password' : 'link')}
        >
          {mode === 'link' ? copy.access.usePassword : copy.access.useLink}
        </button>
      </div>
      {mode === 'password' && isSignIn ? (
        <p className="auth-footer">
          <Link href="/forgot-password">{copy.access.forgotPassword}</Link>
        </p>
      ) : null}
      <p className="auth-footer">
        {isSignIn ? copy.access.newToGleen : copy.access.existingAccount}
        <Link href={alternatePath}>
          {isSignIn ? copy.access.createAccount : copy.access.signIn}
        </Link>
      </p>
      <p className="auth-footer">
        {copy.access.termsPrefix}
        <Link href="/terms">{copy.access.terms}</Link>
        {copy.access.privacyConnector}
        <Link href="/privacy">{copy.access.privacy}</Link>
        {copy.access.sentenceEnd}
      </p>
    </>
  );
}
