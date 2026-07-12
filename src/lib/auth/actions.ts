'use server';

import { validatePublicEnv } from '@/env';
import { createServerSupabaseClient } from '@/lib/supabase/server';

import { safeInternalRedirect } from './redirects';
import {
  emailSchema,
  passwordConfirmationSchema,
  passwordSchema,
} from './schemas';

export type AuthActionState = Readonly<{
  status: 'idle' | 'success' | 'error';
  code?: string;
  message?: string;
  email?: string;
  redirectTo?: string;
}>;

type SupabaseAuthError = Readonly<{
  code?: string;
  message: string;
}>;

function callbackUrl(next: string, recovery = false): string {
  const env = validatePublicEnv(process.env);
  const callback = new URL('/auth/callback', env.NEXT_PUBLIC_APP_URL);
  callback.searchParams.set('next', next);
  if (recovery) callback.searchParams.set('type', 'recovery');
  return callback.toString();
}

function errorState(error: SupabaseAuthError, email?: string): AuthActionState {
  const code = error.code ?? 'auth_error';
  const messages: Record<string, string> = {
    invalid_credentials: 'Email or password is incorrect.',
    user_already_exists: 'An account already exists for this email.',
    email_not_confirmed: 'Confirm your email before signing in.',
    over_email_send_rate_limit: 'Please wait before requesting another email.',
    weak_password: 'Choose a stronger password and try again.',
  };

  return {
    status: 'error',
    code,
    message: messages[code] ?? 'We could not complete that request. Try again.',
    ...(email ? { email } : {}),
  };
}

function invalidState(message: string, email?: string): AuthActionState {
  return {
    status: 'error',
    code: 'validation',
    message,
    ...(email ? { email } : {}),
  };
}

export async function signInWithGoogle(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const next = safeInternalRedirect(formData.get('next'));
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: callbackUrl(next) },
  });

  if (error) return errorState(error);
  return { status: 'success', redirectTo: data.url };
}

export async function sendMagicLink(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsedEmail = emailSchema.safeParse(formData.get('email'));
  if (!parsedEmail.success)
    return invalidState(
      parsedEmail.error.issues[0]?.message ?? 'Invalid email.',
    );

  const email = parsedEmail.data;
  const next = safeInternalRedirect(formData.get('next'));
  const shouldCreateUser = formData.get('intent') === 'sign-up';
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: callbackUrl(next),
      shouldCreateUser,
    },
  });

  if (error) return errorState(error, email);
  return {
    status: 'success',
    code: 'magic_link_sent',
    message: 'Check your inbox for your secure sign-in link.',
    email,
  };
}

export async function signUpWithPassword(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsedEmail = emailSchema.safeParse(formData.get('email'));
  const parsedPassword = passwordSchema.safeParse(formData.get('password'));
  const email = parsedEmail.success ? parsedEmail.data : undefined;

  if (!parsedEmail.success)
    return invalidState(
      parsedEmail.error.issues[0]?.message ?? 'Invalid email.',
    );
  if (!parsedPassword.success)
    return invalidState(
      parsedPassword.error.issues[0]?.message ?? 'Invalid password.',
      email,
    );

  const next = safeInternalRedirect(formData.get('next'));
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signUp({
    email: parsedEmail.data,
    password: parsedPassword.data,
    options: { emailRedirectTo: callbackUrl(next) },
  });

  if (error) return errorState(error, email);
  return {
    status: 'success',
    code: 'verification_required',
    message: 'Check your inbox to verify your email address.',
    email,
  };
}

export async function signInWithPassword(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsedEmail = emailSchema.safeParse(formData.get('email'));
  const parsedPassword = passwordSchema.safeParse(formData.get('password'));
  const email = parsedEmail.success ? parsedEmail.data : undefined;

  if (!parsedEmail.success)
    return invalidState(
      parsedEmail.error.issues[0]?.message ?? 'Invalid email.',
    );
  if (!parsedPassword.success)
    return invalidState(
      parsedPassword.error.issues[0]?.message ?? 'Invalid password.',
      email,
    );

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsedEmail.data,
    password: parsedPassword.data,
  });

  if (error) return errorState(error, email);
  return {
    status: 'success',
    redirectTo: safeInternalRedirect(formData.get('next')),
    email,
  };
}

export async function sendPasswordReset(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsedEmail = emailSchema.safeParse(formData.get('email'));
  if (!parsedEmail.success)
    return invalidState(
      parsedEmail.error.issues[0]?.message ?? 'Invalid email.',
    );

  const email = parsedEmail.data;
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: callbackUrl('/reset-password', true),
  });

  if (error) return errorState(error, email);
  return {
    status: 'success',
    code: 'reset_sent',
    message: 'Check your inbox for a password reset link.',
    email,
  };
}

export async function updatePassword(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = passwordConfirmationSchema.safeParse({
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  });
  if (!parsed.success)
    return invalidState(parsed.error.issues[0]?.message ?? 'Invalid password.');

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) return errorState(error);
  return {
    status: 'success',
    code: 'password_updated',
    message: 'Your password has been updated.',
    redirectTo: '/onboarding',
  };
}

export async function signOut(): Promise<AuthActionState> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) return errorState(error);
  return { status: 'success', redirectTo: '/sign-in' };
}
