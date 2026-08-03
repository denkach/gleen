import 'server-only';

import { selectMessages } from '@/lib/i18n/catalog';
import { formatDate } from '@/lib/i18n/format';
import { localeSchema, type Locale } from '@/lib/i18n/locales';
import { emailMessages } from '@/lib/i18n/messages/email';

export type TransactionalEmailInput =
  | Readonly<{ kind: 'magic_link'; locale: Locale; actionUrl: string }>
  | Readonly<{ kind: 'verify_email'; locale: Locale; actionUrl: string }>
  | Readonly<{ kind: 'password_reset'; locale: Locale; actionUrl: string }>
  | Readonly<{
      kind: 'analysis_ready';
      locale: Locale;
      actionUrl: string;
      title: string;
    }>
  | Readonly<{
      kind: 'payment_failed';
      locale: Locale;
      actionUrl: string;
      planName: string;
    }>
  | Readonly<{
      kind: 'subscription_changed';
      locale: Locale;
      actionUrl: string;
      planName: string;
      effectiveAt: string;
    }>;

export type TransactionalEmailCopy = Readonly<{
  subject: string;
  preview: string;
  heading: string;
  paragraphs: readonly string[];
  actionLabel: string;
  plainText: string;
}>;

type CopyWithoutPlainText = Omit<TransactionalEmailCopy, 'plainText'>;

function withPlainText(
  copy: CopyWithoutPlainText,
  actionUrl: string,
): TransactionalEmailCopy {
  return {
    ...copy,
    plainText: [
      copy.heading,
      ...copy.paragraphs,
      `${copy.actionLabel}: ${actionUrl}`,
    ].join('\n\n'),
  };
}

export function renderTransactionalEmailCopy(
  input: TransactionalEmailInput,
): TransactionalEmailCopy {
  const locale = localeSchema.parse(input.locale);
  const messages = selectMessages(
    emailMessages,
    locale,
    'email',
    () => undefined,
  );

  switch (input.kind) {
    case 'magic_link':
      return withPlainText(
        {
          subject: messages.magicLink.subject,
          preview: messages.magicLink.preview,
          heading: messages.magicLink.heading,
          paragraphs: [
            messages.magicLink.paragraphs.intro,
            messages.magicLink.paragraphs.security,
          ],
          actionLabel: messages.magicLink.actionLabel,
        },
        input.actionUrl,
      );
    case 'verify_email':
      return withPlainText(
        {
          subject: messages.verifyEmail.subject,
          preview: messages.verifyEmail.preview,
          heading: messages.verifyEmail.heading,
          paragraphs: [
            messages.verifyEmail.paragraphs.intro,
            messages.verifyEmail.paragraphs.security,
          ],
          actionLabel: messages.verifyEmail.actionLabel,
        },
        input.actionUrl,
      );
    case 'password_reset':
      return withPlainText(
        {
          subject: messages.passwordReset.subject,
          preview: messages.passwordReset.preview,
          heading: messages.passwordReset.heading,
          paragraphs: [
            messages.passwordReset.paragraphs.intro,
            messages.passwordReset.paragraphs.security,
          ],
          actionLabel: messages.passwordReset.actionLabel,
        },
        input.actionUrl,
      );
    case 'analysis_ready':
      return withPlainText(
        {
          subject: messages.analysisReady.subject(input.title),
          preview: messages.analysisReady.preview(input.title),
          heading: messages.analysisReady.heading,
          paragraphs: [
            messages.analysisReady.paragraphs.intro(input.title),
            messages.analysisReady.paragraphs.artifacts,
          ],
          actionLabel: messages.analysisReady.actionLabel,
        },
        input.actionUrl,
      );
    case 'payment_failed':
      return withPlainText(
        {
          subject: messages.paymentFailed.subject(input.planName),
          preview: messages.paymentFailed.preview(input.planName),
          heading: messages.paymentFailed.heading,
          paragraphs: [
            messages.paymentFailed.paragraphs.intro(input.planName),
            messages.paymentFailed.paragraphs.guidance,
          ],
          actionLabel: messages.paymentFailed.actionLabel,
        },
        input.actionUrl,
      );
    case 'subscription_changed': {
      const effectiveAt = formatDate({
        value: input.effectiveAt,
        locale,
        fallback: input.effectiveAt,
        options: { timeZone: 'UTC' },
      });

      return withPlainText(
        {
          subject: messages.subscriptionChanged.subject(input.planName),
          preview: messages.subscriptionChanged.preview(input.planName),
          heading: messages.subscriptionChanged.heading,
          paragraphs: [
            messages.subscriptionChanged.paragraphs.intro(
              input.planName,
              effectiveAt,
            ),
            messages.subscriptionChanged.paragraphs.guidance,
          ],
          actionLabel: messages.subscriptionChanged.actionLabel,
        },
        input.actionUrl,
      );
    }
  }
}
