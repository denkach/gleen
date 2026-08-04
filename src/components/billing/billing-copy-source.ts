import {
  billingMessages,
  type BillingMessages,
} from '@/lib/i18n/messages/billing';
import type { Locale } from '@/lib/i18n/locales';

export type BillingCopySource =
  | Readonly<{
      kind: 'catalog';
      locale: Locale;
    }>
  | Readonly<{
      kind: 'injected';
      locale: Locale;
      copy: BillingMessages;
    }>;

export function resolveBillingCopySource(source: BillingCopySource): Readonly<{
  locale: Locale;
  copy: BillingMessages;
}> {
  return source.kind === 'catalog'
    ? { locale: source.locale, copy: billingMessages[source.locale] }
    : { locale: source.locale, copy: source.copy };
}
