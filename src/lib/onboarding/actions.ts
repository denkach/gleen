'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { persistInterfaceLocale } from '@/lib/i18n/actions';
import { localeSchema } from '@/lib/i18n/locales';
import type { OnboardingErrorCode } from '@/lib/i18n/messages/onboarding';

import {
  type OnboardingPatch,
  type OnboardingState,
  onboardingStepSchema,
} from './preferences';
import { saveOnboardingStep } from './repository';
import { createSupabaseOnboardingStorage } from './supabase-storage';

export type OnboardingActionState = Readonly<{
  status: 'idle' | 'success' | 'error';
  data?: OnboardingState;
  code?: OnboardingErrorCode;
  redirectTo?: string;
}>;

export async function saveOnboardingPreferences(
  _previousState: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const parsedStep = onboardingStepSchema.safeParse(
    Number(formData.get('step')),
  );
  if (!parsedStep.success) {
    return { status: 'error', code: 'invalid_step' };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: 'error', code: 'session_expired' };

  const step = parsedStep.data;
  const skip = formData.get('skip') === 'true';
  let patch: OnboardingPatch;

  if (step === 1) {
    const interfaceLocale = localeSchema.safeParse(
      formData.get('interfaceLocale'),
    );
    if (!interfaceLocale.success) {
      return {
        status: 'error',
        code: 'invalid_selection',
      };
    }

    const persistence = await persistInterfaceLocale(interfaceLocale.data);
    if (!persistence.ok) {
      return {
        status: 'error',
        code: 'save_failed',
      };
    }

    patch = { onboardingStep: 2 };
  } else if (step === 2) {
    patch = {
      ...(skip ? {} : { outputLocale: formData.get('outputLocale') }),
      onboardingStep: 3,
    } as OnboardingPatch;
  } else {
    patch = {
      ...(skip
        ? {}
        : {
            summaryPreset: formData.get('summaryPreset'),
            flashcardPreset: Number(formData.get('flashcardPreset')),
          }),
      onboardingStep: 3,
      onboardingCompletedAt: new Date().toISOString(),
    } as OnboardingPatch;
  }

  const result = await saveOnboardingStep(
    createSupabaseOnboardingStorage(supabase),
    user.id,
    patch,
  );
  if (!result.ok) {
    return {
      status: 'error',
      code: result.code === 'validation' ? 'invalid_selection' : 'save_failed',
    };
  }

  return {
    status: 'success',
    data: result.data,
    ...(result.data.onboardingCompletedAt ? { redirectTo: '/app' } : {}),
  };
}
