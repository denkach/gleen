import { selectPlural } from './format';
import type { Locale } from './locales';
import type { AppMessages } from './messages/app';
import type { IntakeActionErrorCode } from '@/lib/youtube-intake/action-state';

export function appUsageLabel(
  locale: Locale,
  copy: AppMessages,
  remaining: number,
): string {
  return selectPlural(locale, remaining, copy.shell.usageRemaining);
}

export function appIntakeErrorMessage(
  copy: AppMessages,
  code: IntakeActionErrorCode | undefined,
): string {
  return code
    ? copy.newAnalysis.errors[code]
    : copy.newAnalysis.errors.unexpected;
}
