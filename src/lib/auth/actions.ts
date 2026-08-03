'use server';

import { headers } from 'next/headers';

import { validatePublicEnv } from '@/env';
import {
  isAuthErrorCode,
  type AuthActionCode,
  type AuthErrorCode,
} from '@/lib/i18n/messages/auth';
import { createServerSupabaseClient } from '@/lib/supabase/server';

import { safeInternalRedirect } from './redirects';
import {
  emailSchema,
  passwordConfirmationSchema,
  passwordSchema,
} from './schemas';

export type AuthActionState = Readonly<{
  status: 'idle' | 'success' | 'error';
  code?: AuthActionCode;
  email?: string;
  redirectTo?: string;
}>;

type SupabaseAuthError = Readonly<{
  code?: string;
  message: string;
}>;

async function callbackUrl(next: string, recovery = false): Promise<string> {
  const env = validatePublicEnv(process.env);
  const requestHeaders = await headers();
  const host =
    requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host');
  const protocol = requestHeaders.get('x-forwarded-proto') ?? 'https';
  const origin = host ? `${protocol}://${host}` : env.NEXT_PUBLIC_APP_URL;
  const callback = new URL('/auth/callback', origin);
  callback.searchParams.set('next', next);
  if (recovery) callback.searchParams.set('type', 'recovery');
  return callback.toString();
}

function errorState(error: SupabaseAuthError, email?: string): AuthActionState {
  console.error({
    event: 'auth_provider_error',
    code: error.code ?? 'unknown',
    message: error.message,
  });
  const code = isAuthErrorCode(error.code) ? error.code : 'auth_error';

  return {
    status: 'error',
    code,
    ...(email ? { email } : {}),
  };
}

function validationCode(message: string | undefined): AuthErrorCode {
  return isAuthErrorCode(message) ? message : 'auth_error';
}

function invalidState(code: AuthErrorCode, email?: string): AuthActionState {
  return {
    status: 'error',
    code,
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
    options: { redirectTo: await callbackUrl(next) },
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
    return invalidState(validationCode(parsedEmail.error.issues[0]?.message));

  const email = parsedEmail.data;
  const next = safeInternalRedirect(formData.get('next'));
  const shouldCreateUser = formData.get('intent') === 'sign-up';
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: await callbackUrl(next),
      shouldCreateUser,
    },
  });

  if (error) return errorState(error, email);
  return {
    status: 'success',
    code: 'magic_link_sent',
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
    return invalidState(validationCode(parsedEmail.error.issues[0]?.message));
  if (!parsedPassword.success)
    return invalidState(
      validationCode(parsedPassword.error.issues[0]?.message),
      email,
    );

  const next = safeInternalRedirect(formData.get('next'));
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signUp({
    email: parsedEmail.data,
    password: parsedPassword.data,
    options: { emailRedirectTo: await callbackUrl(next) },
  });

  if (error) return errorState(error, email);
  return {
    status: 'success',
    code: 'verification_required',
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
    return invalidState(validationCode(parsedEmail.error.issues[0]?.message));
  if (!parsedPassword.success)
    return invalidState(
      validationCode(parsedPassword.error.issues[0]?.message),
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
    return invalidState(validationCode(parsedEmail.error.issues[0]?.message));

  const email = parsedEmail.data;
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: await callbackUrl('/reset-password', true),
  });

  if (error) return errorState(error, email);
  return {
    status: 'success',
    code: 'reset_sent',
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
    return invalidState(validationCode(parsed.error.issues[0]?.message));

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) return errorState(error);
  return {
    status: 'success',
    code: 'password_updated',
    redirectTo: '/onboarding',
  };
}

export async function signOut(): Promise<AuthActionState> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) return errorState(error);
  return { status: 'success', redirectTo: '/sign-in' };
}
