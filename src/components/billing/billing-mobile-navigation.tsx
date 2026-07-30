'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

const focusableSelector =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function BillingMobileNavigation() {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);

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
      <nav
        className="billing-mobile-navigation"
        aria-label="Mobile billing navigation"
      >
        <Link href="/app/subscription">Plan</Link>
        <Link href="/app/subscription/usage">Usage</Link>
        <button
          ref={trigger}
          type="button"
          aria-label="More billing screens"
          aria-expanded={open}
          aria-controls="billing-more-sheet"
          onClick={() => setOpen(true)}
        >
          More
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
          aria-label="More billing screens"
        >
          <div className="billing-mobile-sheet-handle" aria-hidden="true" />
          <h2>More billing screens</h2>
          <Link href="/app/subscription/checkout">Checkout</Link>
          <Link href="/app/subscription/portal">Billing portal</Link>
          <Link href="/app/subscription/invoices">Invoices</Link>
          <Link href="/app/subscription/limit-reached">Limit reached</Link>
          <button type="button" onClick={close}>
            Close
          </button>
        </div>
      </div>
    </>
  );
}
