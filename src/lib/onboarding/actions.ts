'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';

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
  message?: string;
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
    return { status: 'error', message: 'Choose a valid onboarding step.' };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: 'error', message: 'Your session has expired.' };

  const step = parsedStep.data;
  const skip = formData.get('skip') === 'true';
  let patch: OnboardingPatch;

  if (step === 1) {
    patch = {
      interfaceLocale: formData.get('interfaceLocale'),
      onboardingStep: 2,
    } as OnboardingPatch;
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
      message:
        result.code === 'validation'
          ? 'Choose one of the available options.'
          : 'We could not save your preferences. Try again.',
    };
  }

  return {
    status: 'success',
    data: result.data,
    ...(result.data.onboardingCompletedAt ? { redirectTo: '/protected' } : {}),
  };
}
