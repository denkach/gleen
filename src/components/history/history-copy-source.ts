import type { Locale } from '@/lib/i18n/locales';
import {
  historyMessages,
  type HistoryMessages,
} from '@/lib/i18n/messages/history';

export type HistoryCopySource =
  | Readonly<{
      kind: 'catalog';
      locale: Locale;
    }>
  | Readonly<{
      kind: 'injected';
      locale: Locale;
      copy: HistoryMessages;
    }>;

export function resolveHistoryCopySource(source: HistoryCopySource): Readonly<{
  locale: Locale;
  copy: HistoryMessages;
}> {
  return source.kind === 'catalog'
    ? { locale: source.locale, copy: historyMessages[source.locale] }
    : { locale: source.locale, copy: source.copy };
}
