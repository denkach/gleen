'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  retrySubscriptionSnapshot,
  type SubscriptionRecoveryResult,
} from '@/lib/billing/subscription-recovery';
import type { Locale } from '@/lib/i18n/locales';
import { toBcp47 } from '@/lib/i18n/locales';
import type { BillingMessages } from '@/lib/i18n/messages/billing';
import { supportEmailHref } from '@/lib/support';

import { BillingIcon } from './billing-icons';
import { BillingCard } from './billing-page';

type RecoveryCopy = BillingMessages['subscription']['error'];

export type SubscriptionRecoveryCardControls = Readonly<{
  retryAction?: () => Promise<SubscriptionRecoveryResult>;
  now?: () => Date;
}>;

type SubscriptionRecoveryCardProps = Readonly<{
  copy: RecoveryCopy;
  locale: Locale;
  supportHref?: string;
}> &
  SubscriptionRecoveryCardControls;

export function SubscriptionRecoveryCard({
  copy,
  locale,
  supportHref = supportEmailHref,
  retryAction = retrySubscriptionSnapshot,
  now = () => new Date(),
}: SubscriptionRecoveryCardProps) {
  const router = useRouter();
  const retryButtonRef = useRef<HTMLButtonElement>(null);
  const pendingRef = useRef(false);
  const [pending, setPending] = useState(false);
  const [failedAgain, setFailedAgain] = useState(false);
  const [lastAttempt, setLastAttempt] = useState<Date | null>(null);

  async function retry() {
    if (pendingRef.current) return;

    pendingRef.current = true;
    setPending(true);
    setFailedAgain(false);
    setLastAttempt(now());

    let result: SubscriptionRecoveryResult;
    try {
      result = await retryAction();
    } catch {
      result = { status: 'error', code: 'snapshot_unavailable' };
    }

    pendingRef.current = false;
    setPending(false);
    if (result.status === 'success') {
      router.refresh();
      return;
    }

    setFailedAgain(true);
    retryButtonRef.current?.focus();
  }

  const attemptLabel =
    lastAttempt === null
      ? copy.notRetried
      : copy.lastAttempt(
          new Intl.DateTimeFormat(toBcp47(locale), {
            hour: '2-digit',
            minute: '2-digit',
            hourCycle: 'h23',
          }).format(lastAttempt),
        );

  return (
    <BillingCard as="article" className="billing-recovery-card">
      <div className="billing-recovery-symbol" aria-hidden="true">
        <span>
          <BillingIcon name="alert" />
        </span>
      </div>
      <div className="billing-recovery-copy">
        <h2>{copy.title}</h2>
        <p>{copy.description}</p>
        <div className="billing-recovery-actions">
          <button
            className="billing-button billing-button-primary"
            disabled={pending}
            onClick={retry}
            ref={retryButtonRef}
            type="button"
          >
            {pending ? (
              <span className="billing-recovery-spinner" aria-hidden="true" />
            ) : (
              <BillingIcon name="history" />
            )}
            <span>{pending ? copy.retrying : copy.retry}</span>
            <span aria-hidden="true">→</span>
          </button>
          <a className="billing-button" href={supportHref}>
            {copy.support}
          </a>
        </div>
        <p
          aria-live={failedAgain ? 'assertive' : 'polite'}
          className="billing-recovery-status"
          role={failedAgain ? 'alert' : 'status'}
        >
          {failedAgain ? copy.retryFailed : ''}
        </p>
        <div className="billing-recovery-meta">
          <span>
            <BillingIcon name="lock" />
            {copy.secure}
          </span>
          <span>
            <BillingIcon name="history" />
            {attemptLabel}
          </span>
        </div>
      </div>
    </BillingCard>
  );
}
