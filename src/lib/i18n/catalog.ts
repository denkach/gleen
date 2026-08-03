import type { Locale } from './locales';

type MessageFunction = (...args: never[]) => string;

export type MessageTree = {
  readonly [key: string]: MessageValue;
};

export type MessageValue = string | MessageFunction | MessageTree;

type WidenMessage<Value> = Value extends (...args: infer Arguments) => unknown
  ? (...args: Arguments) => string
  : Value extends string
    ? string
    : Value extends object
      ? { readonly [Key in keyof Value]: WidenMessage<Value[Key]> }
      : never;

export type LocalizedMessages<English extends MessageTree> = {
  readonly [Key in Locale]: WidenMessage<English>;
};

type MessageCatalogInput<English extends MessageTree> = {
  readonly en: English;
} & {
  readonly [Key in Exclude<Locale, 'en'>]: WidenMessage<English>;
};

export type MissingTranslationEvent = Readonly<{
  event: 'missing_translation';
  namespace: string;
  locale: Locale;
}>;

export type MissingTranslationReporter = (
  event: MissingTranslationEvent,
) => void;

export function defineMessages<const English extends MessageTree>(
  catalog: MessageCatalogInput<English>,
): LocalizedMessages<English> {
  return catalog as unknown as LocalizedMessages<English>;
}

export function selectMessages<English extends MessageTree>(
  catalog: LocalizedMessages<English>,
  locale: Locale,
  namespace: string,
  reporter: MissingTranslationReporter,
): WidenMessage<English> {
  const selected = catalog[locale];

  if (selected) return selected;

  if (process.env.NODE_ENV !== 'production') {
    throw new Error(`Missing translation: ${namespace} (${locale})`);
  }

  reporter({ event: 'missing_translation', namespace, locale });
  return catalog.en;
}
