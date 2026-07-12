import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth/actions', () => ({
  sendMagicLink: vi.fn(),
  signInWithGoogle: vi.fn(),
  signInWithPassword: vi.fn(),
  signUpWithPassword: vi.fn(),
  sendPasswordReset: vi.fn(),
  updatePassword: vi.fn(),
}));

import { AccessForm } from './access-form';

describe('account access and recovery routes', () => {
  it('matches the approved sign-in hierarchy and offers both email modes', () => {
    render(<AccessForm intent="sign-in" />);

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
    ).toHaveAttribute('href', '/sign-up');
  });

  it('defines every required recovery and session route', async () => {
    const routes = [
      ['verify-email', 'Check your email'],
      ['forgot-password', 'Reset your password'],
      ['reset-password', 'Choose a new password'],
      ['session-expired', 'Your session expired'],
    ] as const;

    for (const [route, heading] of routes) {
      const source = await readFile(
        join(process.cwd(), `src/app/(auth)/${route}/page.tsx`),
        'utf8',
      );
      expect(source).toContain(heading);
      expect(source).toContain('AuthShell');
    }
  });

  it('keeps legal and account-switch links in the approved access screens', async () => {
    const accessForm = await readFile(
      join(process.cwd(), 'src/components/auth/access-form.tsx'),
      'utf8',
    );

    expect(accessForm).toContain('Sign in to Gleen');
    expect(accessForm).toContain('Create your account');
    expect(accessForm).toContain('/terms');
    expect(accessForm).toContain('/privacy');
  });
});
