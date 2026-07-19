'use client';

import { useEffect, useRef, useState } from 'react';

const mobileResultQuery = '(max-width: 620px)';

export function useMobileResultLayout(
  onChange?: (mobile: boolean) => void,
): boolean {
  const [mobile, setMobile] = useState(false);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;

    const query = window.matchMedia(mobileResultQuery);
    const update = () => {
      onChangeRef.current?.(query.matches);
      setMobile(query.matches);
    };
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return mobile;
}
