'use client';

import { useState } from 'react';

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { MarketingLink } from '@/data/marketing';
import type { MarketingMessages } from '@/lib/i18n/messages/marketing';

interface MobileMarketingMenuProps {
  navigation: readonly MarketingLink[];
  copy: MarketingMessages['header'];
}

function MenuIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function MobileMarketingMenu({
  navigation,
  copy,
}: MobileMarketingMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className="btn btn-icon btn-ghost mobile-only"
        aria-label={copy.openMenu}
      >
        <MenuIcon />
      </DialogTrigger>
      <DialogContent
        className="landing-mobile-menu"
        title={copy.menuTitle}
        description={copy.menuDescription}
        closeLabel={copy.closeMenu}
      >
        <nav aria-label={copy.navigationLabel}>
          {navigation.map((link) => (
            <DialogClose asChild key={link.href}>
              <a href={link.href}>{link.label}</a>
            </DialogClose>
          ))}
        </nav>
        <DialogClose asChild>
          <a href="/sign-in">{copy.signIn}</a>
        </DialogClose>
        <DialogClose asChild>
          <a href="/sign-up">{copy.startFree}</a>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
