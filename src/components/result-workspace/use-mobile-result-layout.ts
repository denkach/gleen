'use client';

import { useEffect, useState } from 'react';

const mobileResultQuery = '(max-width: 620px)';

export function useMobileResultLayout(): boolean {
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;

    const query = window.matchMedia(mobileResultQuery);
    const update = () => setMobile(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return mobile;
}
