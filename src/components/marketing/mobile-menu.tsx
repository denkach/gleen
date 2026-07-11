'use client';

import { useState } from 'react';

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';
import { marketingContent } from '@/data/marketing';

import { MarketingIcon } from './marketing-icon';

export function MobileMenu() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="btn btn-icon btn-ghost mobile-only"
          type="button"
          aria-label="Open menu"
        >
          <MarketingIcon className="icon" name="menu" />
        </button>
      </DialogTrigger>
      <DialogContent
        className="marketing-mobile-menu"
        title="Navigation"
        description="Navigate the Gleen landing page."
      >
        <nav className="mobile-menu-links" aria-label="Mobile navigation">
          {marketingContent.navigation.map((link) => (
            <DialogClose asChild key={link.href}>
              <a href={link.href}>{link.label}</a>
            </DialogClose>
          ))}
        </nav>
      </DialogContent>
    </Dialog>
  );
}
