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
    const revealTargets = [
      ...root.querySelectorAll<HTMLElement>(
        '.site-header .brand,.site-header .header-nav,.site-header .header-actions,.hero-copy > *,.prism-stage,.section-heading > *,.process-step,.facet-panel,.plan-card,.site-footer .footer-grid > *,.site-footer .footer-bottom',
      ),
    ];
    revealTargets.forEach((target) =>
      target.setAttribute('data-reveal', 'glow'),
    );
    new Set(revealTargets.map((target) => target.parentElement)).forEach(
      (parent) =>
        [...(parent?.children ?? [])]
          .filter((child): child is HTMLElement =>
            child.hasAttribute('data-reveal'),
          )
          .forEach((child, index) =>
            child.style.setProperty(
              '--reveal-delay',
              `${Math.min(index * 70, 420)}ms`,
            ),
          ),
    );
    let revealObserver: IntersectionObserver | undefined;
    if (!reduceMotion && 'IntersectionObserver' in window) {
      revealObserver = new IntersectionObserver(
        (entries) =>
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-in-view');
            revealObserver?.unobserve(entry.target);
          }),
        { threshold: 0.08, rootMargin: '0px 0px -7% 0px' },
      );
      revealTargets.forEach((target) => revealObserver?.observe(target));
    } else
      revealTargets.forEach((target) => target.classList.add('is-in-view'));
    cleanups.push(() => revealObserver?.disconnect());
    const stage = root.querySelector<HTMLElement>('.prism-stage');
    const artifacts = [
      ...root.querySelectorAll<HTMLElement>('.artifact-float'),
    ];
    const prism = root.querySelector<HTMLElement>('.prism-wrap');
    if (stage && prism && finePointer && !reduceMotion) {
      const onPrismMove = (event: PointerEvent) => {
        const rect = prism.getBoundingClientRect();
        const x =
          Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)) -
          0.5;
        const y =
          Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)) -
          0.5;
        prism.style.setProperty('--prism-x', `${x * 12}px`);
        prism.style.setProperty('--prism-y', `${y * 9}px`);
        prism.style.setProperty('--prism-rotate-x', `${y * -2.4}deg`);
        prism.style.setProperty('--prism-rotate-y', `${x * 3.2}deg`);
      };
      const resetPrism = () => {
        [
          '--prism-x',
          '--prism-y',
          '--prism-rotate-x',
          '--prism-rotate-y',
        ].forEach((property) => prism.style.removeProperty(property));
      };
      stage.addEventListener('pointermove', onPrismMove, { passive: true });
      stage.addEventListener('pointerleave', resetPrism);
      cleanups.push(() => {
        stage.removeEventListener('pointermove', onPrismMove);
        stage.removeEventListener('pointerleave', resetPrism);
        resetPrism();
      });
    }
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
          if (active) {
            facets.forEach((facet) =>
              facet.classList.toggle(
                'is-active-facet',
                facet === active.target,
              ),
            );
            const color = active.target.classList.contains('amber')
              ? '255,180,84'
              : active.target.classList.contains('cyan')
                ? '91,233,233'
                : active.target.classList.contains('lime')
                  ? '168,224,99'
                  : '199,125,255';
            root.style.setProperty('--active-spectrum', color);
          }
        },
        { threshold: [0.22, 0.45, 0.7] },
      );
      facets.forEach((facet) => observer?.observe(facet));
    } else facets.forEach((facet) => facet.classList.add('is-active-facet'));
    cleanups.push(() => observer?.disconnect());

    if (finePointer && !reduceMotion) {
      root
        .querySelectorAll<HTMLElement>(
          '.btn-primary,.site-header .btn,.plan-card .btn',
        )
        .forEach((button) => {
          const move = (event: PointerEvent) => {
            const rect = button.getBoundingClientRect();
            button.style.setProperty(
              '--magnet-x',
              `${(event.clientX - rect.left - rect.width / 2) * 0.12}px`,
            );
            button.style.setProperty(
              '--magnet-y',
              `${(event.clientY - rect.top - rect.height / 2) * 0.14}px`,
            );
          };
          const reset = () => {
            button.style.setProperty('--magnet-x', '0px');
            button.style.setProperty('--magnet-y', '0px');
          };
          button.addEventListener('pointermove', move, { passive: true });
          button.addEventListener('pointerleave', reset);
          cleanups.push(() => {
            button.removeEventListener('pointermove', move);
            button.removeEventListener('pointerleave', reset);
          });
        });
    }

    if (finePointer && !reduceMotion) {
      const cursor = document.createElement('div');
      cursor.className = 'motion-cursor';
      cursor.setAttribute('aria-hidden', 'true');
      cursor.innerHTML =
        '<span class="motion-cursor-core"></span><span class="motion-cursor-ring"></span>';
      root.appendChild(cursor);
      let targetX = innerWidth / 2;
      let targetY = innerHeight / 2;
      let currentX = targetX;
      let currentY = targetY;
      let ringX = targetX;
      let ringY = targetY;
      let cursorFrame = 0;
      const renderCursor = () => {
        currentX += (targetX - currentX) * 0.34;
        currentY += (targetY - currentY) * 0.34;
        ringX += (targetX - ringX) * 0.13;
        ringY += (targetY - ringY) * 0.13;
        cursor.style.setProperty('--cursor-x', `${currentX}px`);
        cursor.style.setProperty('--cursor-y', `${currentY}px`);
        cursor.style.setProperty('--ring-x', `${ringX}px`);
        cursor.style.setProperty('--ring-y', `${ringY}px`);
        cursorFrame = requestAnimationFrame(renderCursor);
      };
      const onPointerMove = (event: PointerEvent) => {
        targetX = event.clientX;
        targetY = event.clientY;
        cursor.classList.add('is-visible');
        cursor.classList.toggle(
          'is-interactive',
          event.target instanceof Element &&
            Boolean(event.target.closest('a,button,input')),
        );
        cursor.classList.toggle(
          'is-input',
          event.target instanceof Element &&
            Boolean(event.target.closest('input,select,textarea')),
        );
      };
      addEventListener('pointermove', onPointerMove, { passive: true });
      renderCursor();
      cleanups.push(() => {
        removeEventListener('pointermove', onPointerMove);
        cancelAnimationFrame(cursorFrame);
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
      revealTargets.forEach((target) => {
        target.removeAttribute('data-reveal');
        target.classList.remove('is-in-view');
        target.style.removeProperty('--reveal-delay');
      });
    };
  }, []);

  return <span data-motion-controller hidden />;
}
