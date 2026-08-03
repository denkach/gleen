'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

import type { BillingMessages } from '@/lib/i18n/messages/billing';

import { BillingIcon } from './billing-icons';

const focusableSelector =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
const subscribeToHydration = () => () => {};

export function BillingMobileNavigation({
  copy,
}: Readonly<{ copy: BillingMessages['navigation'] }>) {
  const pathname = usePathname() ?? '';
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const fixtureMode = pathname.startsWith('/billing-fixture/');
  const planHref = fixtureMode
    ? '/billing-fixture/subscription'
    : '/app/subscription';
  const usageHref = fixtureMode
    ? '/billing-fixture/usage'
    : '/app/subscription/usage';
  const detailBase = fixtureMode ? '/billing-fixture' : '/app/subscription';
  const planActive =
    pathname === '/app/subscription' ||
    pathname === '/billing-fixture/subscription';
  const usageActive =
    pathname === '/app/subscription/usage' ||
    pathname === '/billing-fixture/usage';
  const moreActive =
    open ||
    (!planActive &&
      !usageActive &&
      (pathname.startsWith('/app/subscription/') ||
        pathname.startsWith('/billing-fixture/')));

  function close() {
    setOpen(false);
    window.requestAnimationFrame(() => trigger.current?.focus());
  }

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const panel = dialog.current;
    panel?.querySelector<HTMLElement>(focusableSelector)?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== 'Tab' || panel === null) return;
      const focusable = [
        ...panel.querySelectorAll<HTMLElement>(focusableSelector),
      ];
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable.at(-1)!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      <nav className="billing-mobile-navigation" aria-label={copy.mobileLabel}>
        <Link
          className={planActive ? 'active' : undefined}
          href={planHref}
          aria-current={planActive ? 'page' : undefined}
        >
          <BillingIcon name="plan" />
          <span>{copy.plan}</span>
        </Link>
        <Link
          className={usageActive ? 'active' : undefined}
          href={usageHref}
          aria-current={usageActive ? 'page' : undefined}
        >
          <BillingIcon name="chart" />
          <span>{copy.usage}</span>
        </Link>
        <button
          className={moreActive ? 'active' : undefined}
          ref={trigger}
          type="button"
          aria-label={copy.moreLabel}
          aria-current={moreActive ? 'page' : undefined}
          aria-expanded={open}
          aria-controls="billing-more-sheet"
          disabled={!hydrated}
          onClick={() => setOpen(true)}
        >
          <BillingIcon name="more" />
          <span>{copy.more}</span>
        </button>
      </nav>
      <div
        className="billing-mobile-sheet"
        data-open={open || undefined}
        aria-hidden={!open}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) close();
        }}
      >
        <div
          className="billing-mobile-sheet-panel"
          id="billing-more-sheet"
          ref={dialog}
          role="dialog"
          aria-modal="true"
          aria-label={copy.moreLabel}
        >
          <div className="billing-mobile-sheet-handle" aria-hidden="true" />
          <h2>{copy.moreLabel}</h2>
          <Link href={`${detailBase}/checkout`}>{copy.checkout}</Link>
          <Link href={`${detailBase}/portal`}>{copy.portal}</Link>
          <Link href={`${detailBase}/invoices`}>{copy.invoices}</Link>
          <Link href={`${detailBase}/limit-reached`}>{copy.limitReached}</Link>
          <button type="button" onClick={close}>
            {copy.close}
          </button>
        </div>
      </div>
    </>
  );
}
