'use client';

import { useEffect } from 'react';

import { getBrowserMotionPolicy } from './motion-policy';

export type MotionRuntime = Readonly<{
  setup: (root: HTMLElement) => () => void;
}>;
export type MotionLoader = () => Promise<MotionRuntime>;

async function loadDefaultMotion(): Promise<MotionRuntime> {
  const [{ gsap }, { ScrollTrigger }] = await Promise.all([
    import('gsap'),
    import('gsap/ScrollTrigger'),
  ]);
  gsap.registerPlugin(ScrollTrigger);

  return {
    setup(root) {
      root.dataset.motionReady = 'true';
      const context = gsap.context(() => {
        gsap.to('.process-scene', {
          '--beam-progress': 1,
          ease: 'none',
          scrollTrigger: {
            trigger: '.process-scene',
            start: 'top 72%',
            end: 'bottom 38%',
            scrub: true,
          },
        });
        gsap.utils.toArray<HTMLElement>('.process-step').forEach((step) => {
          ScrollTrigger.create({
            trigger: step,
            start: 'top 72%',
            toggleClass: 'is-lit',
          });
        });
        gsap.utils.toArray<HTMLElement>('.facet-panel').forEach((panel) => {
          ScrollTrigger.create({
            trigger: panel,
            start: 'top 70%',
            end: 'bottom 30%',
            toggleClass: 'is-active-facet',
          });
        });
      }, root);

      return () => {
        context.revert();
        delete root.dataset.motionReady;
      };
    },
  };
}

export function MotionController({
  loadMotion = loadDefaultMotion,
}: Readonly<{ loadMotion?: MotionLoader }>) {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('[data-marketing-root]');
    if (!root) return;
    const policy = getBrowserMotionPolicy(window.matchMedia?.bind(window));
    if (!policy.enableGsap) return;

    let disposed = false;
    let cleanup: (() => void) | undefined;
    void loadMotion()
      .then((runtime) => {
        if (disposed) return;
        cleanup = runtime.setup(root);
      })
      .catch(() => undefined);
    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [loadMotion]);

  return null;
}
