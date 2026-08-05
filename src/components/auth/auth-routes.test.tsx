import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth/actions', () => ({
  sendMagicLink: vi.fn(),
  signInWithGoogle: vi.fn(),
  signInWithPassword: vi.fn(),
  signUpWithPassword: vi.fn(),
  sendPasswordReset: vi.fn(),
  updatePassword: vi.fn(),
}));
vi.mock('@/lib/i18n/request-locale', () => ({
  getRequestLocale: vi.fn(async () => 'en'),
}));
vi.mock('@/lib/i18n/actions', () => ({ setInterfaceLocale: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

import { AccessForm } from './access-form';
import { authMessages } from '@/lib/i18n/messages/auth';
import SignInPage from '@/app/(auth)/sign-in/page';
import SignUpPage from '@/app/(auth)/sign-up/page';
import VerifyEmailPage from '@/app/(auth)/verify-email/page';
import ForgotPasswordPage from '@/app/(auth)/forgot-password/page';
import ResetPasswordPage from '@/app/(auth)/reset-password/page';
import SessionExpiredPage from '@/app/(auth)/session-expired/page';
import { ForgotPasswordForm, ResetPasswordForm } from './recovery-forms';

describe('account access and recovery routes', () => {
  it('matches the approved sign-in hierarchy and offers both email modes', () => {
    render(
      <AccessForm
        copy={authMessages.en}
        intent="sign-in"
        nextPath="/app?continuation=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DdQw4w9WgXcQ"
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Continue with Google' }),
    ).toBeVisible();
    expect(screen.getByLabelText('Email address')).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Send secure sign-in link' }),
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Use password instead' }),
    ).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'Create an account' }),
    ).toHaveAttribute(
      'href',
      '/sign-up?next=%2Fapp%3Fcontinuation%3Dhttps%253A%252F%252Fwww.youtube.com%252Fwatch%253Fv%253DdQw4w9WgXcQ',
    );
    expect(screen.getAllByDisplayValue(/^\/app\?continuation=/)).toHaveLength(
      2,
    );
  });

  it('renders a German message for a stable invalid-email code', async () => {
    const user = userEvent.setup();
    const { sendMagicLink } = await import('@/lib/auth/actions');
    vi.mocked(sendMagicLink).mockResolvedValueOnce({
      status: 'error',
      code: 'email_invalid',
    });
    render(<AccessForm intent="sign-in" copy={authMessages.de} />);

    await user.type(screen.getByLabelText('E-Mail-Adresse'), 'keine-email');
    const submit = screen.getByRole('button', {
      name: 'Sicheren Anmeldelink senden',
    });
    expect(submit.closest('form')).toHaveProperty('noValidate', true);
    await user.click(submit);

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Gib eine gültige E-Mail-Adresse ein.',
      ),
    );
  });

  it('submits a natively short password to the localized action path', async () => {
    const user = userEvent.setup();
    const { signInWithPassword } = await import('@/lib/auth/actions');
    vi.mocked(signInWithPassword).mockResolvedValueOnce({
      status: 'error',
      code: 'password_too_short',
      email: 'alex@example.com',
    });
    render(<AccessForm intent="sign-in" copy={authMessages.de} />);

    await user.click(
      screen.getByRole('button', { name: 'Stattdessen Passwort verwenden' }),
    );
    await user.type(
      screen.getByLabelText('E-Mail-Adresse'),
      'alex@example.com',
    );
    await user.type(screen.getByLabelText('Passwort'), 'kurz');
    const submit = screen.getByRole('button', {
      name: 'Mit Passwort anmelden',
    });
    expect(submit.closest('form')).toHaveProperty('noValidate', true);
    await user.click(submit);

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Verwende mindestens 8 Zeichen.',
      ),
    );
  });

  it('submits an invalid recovery email to the localized action path', async () => {
    const user = userEvent.setup();
    const { sendPasswordReset } = await import('@/lib/auth/actions');
    vi.mocked(sendPasswordReset).mockResolvedValueOnce({
      status: 'error',
      code: 'email_invalid',
    });
    render(<ForgotPasswordForm copy={authMessages.de} />);

    await user.type(screen.getByLabelText('E-Mail-Adresse'), 'keine-email');
    const submit = screen.getByRole('button', {
      name: 'Link zum Zurücksetzen senden',
    });
    expect(submit.closest('form')).toHaveProperty('noValidate', true);
    await user.click(submit);

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Gib eine gültige E-Mail-Adresse ein.',
      ),
    );
  });

  it('submits a natively short reset password to the localized action path', async () => {
    const user = userEvent.setup();
    const { updatePassword } = await import('@/lib/auth/actions');
    vi.mocked(updatePassword).mockResolvedValueOnce({
      status: 'error',
      code: 'password_too_short',
    });
    render(<ResetPasswordForm copy={authMessages.de} />);

    await user.type(screen.getByLabelText('Passwort'), 'kurz');
    await user.type(screen.getByLabelText('Passwort bestätigen'), 'kurz');
    const submit = screen.getByRole('button', {
      name: 'Passwort aktualisieren',
    });
    expect(submit.closest('form')).toHaveProperty('noValidate', true);
    await user.click(submit);

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Verwende mindestens 8 Zeichen.',
      ),
    );
  });

  it('renders a German success message from a stable action code', async () => {
    const user = userEvent.setup();
    const { sendMagicLink } = await import('@/lib/auth/actions');
    vi.mocked(sendMagicLink).mockResolvedValueOnce({
      status: 'success',
      code: 'magic_link_sent',
      email: 'alex@example.com',
    });
    render(<AccessForm intent="sign-in" copy={authMessages.de} />);

    await user.type(
      screen.getByLabelText('E-Mail-Adresse'),
      'alex@example.com',
    );
    await user.click(
      screen.getByRole('button', { name: 'Sicheren Anmeldelink senden' }),
    );

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'In deinem Postfach findest du deinen sicheren Anmeldelink.',
      ),
    );
  });

  it('defines every required recovery and session route', async () => {
    const pages = [
      [VerifyEmailPage, 'Check your email'],
      [ForgotPasswordPage, 'Reset your password'],
      [ResetPasswordPage, 'Choose a new password'],
      [SessionExpiredPage, 'Your session expired'],
    ] as const;

    for (const [Page, heading] of pages) {
      const page = await Page();
      render(page);
      expect(screen.getByRole('heading', { name: heading })).toBeVisible();
      cleanup();
    }
  });

  it('keeps legal and account-switch links in the approved access screens', async () => {
    render(<AccessForm intent="sign-in" copy={authMessages.en} />);

    expect(
      screen.getByRole('heading', { name: 'Sign in to Gleen' }),
    ).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'Create an account' }),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'Terms' })).toHaveAttribute(
      'href',
      '/terms',
    );
    expect(
      screen.getByRole('link', { name: 'Privacy Policy' }),
    ).toHaveAttribute('href', '/privacy');
  });

  it.each([
    ['//evil.example', '/onboarding'],
    [String.raw`/\evil.example`, '/onboarding'],
    ['/app?continuation=normalized', '/app?continuation=normalized'],
  ])('validates the sign-in continuation %s', async (next, expected) => {
    render(
      await SignInPage({
        searchParams: Promise.resolve({ next }),
      }),
    );

    expect(screen.getAllByDisplayValue(expected)).toHaveLength(2);
  });

  it.each([
    ['//evil.example', '/onboarding'],
    [String.raw`/\evil.example`, '/onboarding'],
    ['/app?continuation=normalized', '/app?continuation=normalized'],
  ])('validates the sign-up continuation %s', async (next, expected) => {
    render(await SignUpPage({ searchParams: Promise.resolve({ next }) }));
    expect(screen.getAllByDisplayValue(expected)).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      `/sign-in?next=${encodeURIComponent(expected)}`,
    );
  });
});
