'use client';

import { useEffect } from 'react';

export function shouldReduceMotion(preference: boolean) {
  return preference;
}

export function ReferenceMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.landing-reference');
    if (!root) return;
    const media = window.matchMedia?.bind(window);
    const reduceMotion = shouldReduceMotion(
      media ? media('(prefers-reduced-motion: reduce)').matches : true,
    );
    const finePointer = media ? media('(pointer: fine)').matches : false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const cleanups: (() => void)[] = [];
    const later = (callback: () => void, delay: number) =>
      timers.push(setTimeout(callback, delay));

    root.classList.add('motion-ready');
    root.classList.toggle('reduce-motion', reduceMotion);
    const stage = root.querySelector<HTMLElement>('.prism-stage');
    const artifacts = [
      ...root.querySelectorAll<HTMLElement>('.artifact-float'),
    ];
    const emitArtifacts = (immediate = false) => {
      artifacts.forEach((artifact) => artifact.classList.remove('is-emitted'));
      stage?.classList.remove('is-transforming', 'is-awake');
      void stage?.offsetWidth;
      stage?.classList.add('is-awake');
      artifacts.forEach((artifact, index) =>
        later(
          () => artifact.classList.add('is-emitted'),
          reduceMotion ? 0 : (immediate ? 120 : 540) + index * 110,
        ),
      );
    };
    later(() => emitArtifacts(), reduceMotion ? 0 : 180);

    const form = root.querySelector<HTMLFormElement>('.beam-form');
    const onSubmit = (event: SubmitEvent) => {
      event.preventDefault();
      if (!form) return;
      form.classList.remove('is-flashing', 'is-processing');
      void form.offsetWidth;
      form.classList.add('is-flashing', 'is-processing');
      emitArtifacts(true);
      stage?.classList.add('is-transforming');
      const label = form.querySelector<HTMLElement>(
        'button[type="submit"] span',
      );
      if (label) label.textContent = 'Refracting…';
      later(
        () => {
          form.classList.remove('is-flashing', 'is-processing');
          stage?.classList.remove('is-transforming');
          if (label) label.textContent = 'Transform video';
        },
        reduceMotion ? 40 : 1250,
      );
    };
    form?.addEventListener('submit', onSubmit);
    cleanups.push(() => form?.removeEventListener('submit', onSubmit));

    const scene = root.querySelector<HTMLElement>('.process-scene');
    const steps = scene
      ? [...scene.querySelectorAll<HTMLElement>('.process-step')]
      : [];
    let frame = 0;
    const updateScroll = () => {
      frame = 0;
      if (!scene) return;
      const rect = scene.getBoundingClientRect();
      const start = innerHeight * 0.82;
      const end = innerHeight * 0.18;
      const progress = Math.min(
        1,
        Math.max(
          0,
          (start - rect.top) / Math.max(rect.height + start - end, 1),
        ),
      );
      scene.style.setProperty('--beam-progress', progress.toFixed(4));
      steps.forEach((step, index) =>
        step.classList.toggle(
          'is-lit',
          progress + 0.08 >= index / (steps.length - 1),
        ),
      );
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(updateScroll);
    };
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll, { passive: true });
    cleanups.push(() => {
      removeEventListener('scroll', onScroll);
      removeEventListener('resize', onScroll);
      cancelAnimationFrame(frame);
    });
    updateScroll();

    const facets = [...root.querySelectorAll<HTMLElement>('.facet-panel')];
    let observer: IntersectionObserver | undefined;
    if (!reduceMotion && 'IntersectionObserver' in window) {
      observer = new IntersectionObserver(
        (entries) => {
          const active = entries
            .filter((entry) => entry.isIntersecting)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
          if (active)
            facets.forEach((facet) =>
              facet.classList.toggle(
                'is-active-facet',
                facet === active.target,
              ),
            );
        },
        { threshold: [0.22, 0.45, 0.7] },
      );
      facets.forEach((facet) => observer?.observe(facet));
    } else facets.forEach((facet) => facet.classList.add('is-active-facet'));
    cleanups.push(() => observer?.disconnect());

    if (finePointer && !reduceMotion) {
      const cursor = document.createElement('div');
      cursor.className = 'motion-cursor';
      cursor.setAttribute('aria-hidden', 'true');
      cursor.innerHTML =
        '<span class="motion-cursor-core"></span><span class="motion-cursor-ring"></span>';
      root.appendChild(cursor);
      const onPointerMove = (event: PointerEvent) => {
        cursor.style.setProperty('--cursor-x', `${event.clientX}px`);
        cursor.style.setProperty('--cursor-y', `${event.clientY}px`);
        cursor.classList.add('is-visible');
        cursor.classList.toggle(
          'is-interactive',
          event.target instanceof Element &&
            Boolean(event.target.closest('a,button,input')),
        );
      };
      addEventListener('pointermove', onPointerMove, { passive: true });
      cleanups.push(() => {
        removeEventListener('pointermove', onPointerMove);
        cursor.remove();
      });
    }

    return () => {
      timers.forEach(clearTimeout);
      cleanups.forEach((cleanup) => cleanup());
      root.classList.remove('motion-ready', 'reduce-motion');
      stage?.classList.remove('is-transforming', 'is-awake');
      artifacts.forEach((artifact) => artifact.classList.remove('is-emitted'));
      scene?.style.removeProperty('--beam-progress');
      steps.forEach((step) => step.classList.remove('is-lit'));
      facets.forEach((facet) => facet.classList.remove('is-active-facet'));
    };
  }, []);

  return <span data-motion-controller hidden />;
}
