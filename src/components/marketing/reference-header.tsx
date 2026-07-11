'use client';

import { useEffect } from 'react';

export function isHeaderScrolled(scrollY: number) {
  return scrollY > 18;
}

export function ReferenceHeaderBehavior() {
  useEffect(() => {
    const header = document.querySelector<HTMLElement>(
      '.landing-reference .site-header',
    );
    if (!header) return;
    let frame = 0;
    const update = () =>
      header.classList.toggle('scrolled', isHeaderScrolled(window.scrollY));
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        update();
      });
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
      header.classList.remove('scrolled');
    };
  }, []);
  return <span data-header-behavior hidden />;
}
