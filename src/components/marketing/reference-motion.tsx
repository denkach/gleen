export function shouldReduceMotion(preference: boolean) {
  return preference;
}

const motionScript = `(() => {
  const root = document.querySelector('.landing-reference');
  if (!root) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  root.classList.add('motion-ready');
  root.classList.toggle('reduce-motion', reduceMotion);
  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const stage = root.querySelector('.prism-stage');
  const artifacts = [...root.querySelectorAll('.artifact-float')];
  const emitArtifacts = (immediate = false) => {
    artifacts.forEach((artifact) => artifact.classList.remove('is-emitted'));
    stage?.classList.remove('is-transforming', 'is-awake');
    void stage?.offsetWidth;
    stage?.classList.add('is-awake');
    artifacts.forEach((artifact, index) => setTimeout(() => artifact.classList.add('is-emitted'), reduceMotion ? 0 : (immediate ? 120 : 540) + index * 110));
  };
  setTimeout(() => emitArtifacts(), reduceMotion ? 0 : 180);
  const form = root.querySelector('.beam-form');
  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    form.classList.remove('is-flashing', 'is-processing');
    void form.offsetWidth;
    form.classList.add('is-flashing', 'is-processing');
    emitArtifacts(true);
    stage?.classList.add('is-transforming');
    const label = form.querySelector('button[type="submit"] span');
    if (label) label.textContent = 'Refracting…';
    setTimeout(() => {
      form.classList.remove('is-flashing', 'is-processing');
      stage?.classList.remove('is-transforming');
      if (label) label.textContent = 'Transform video';
    }, reduceMotion ? 40 : 1250);
  });
  const scene = root.querySelector('.process-scene');
  const steps = scene ? [...scene.querySelectorAll('.process-step')] : [];
  let frame = 0;
  const updateScroll = () => {
    frame = 0;
    if (!scene) return;
    const rect = scene.getBoundingClientRect();
    const start = innerHeight * .82;
    const end = innerHeight * .18;
    const progress = clamp((start - rect.top) / Math.max(rect.height + start - end, 1));
    scene.style.setProperty('--beam-progress', progress.toFixed(4));
    steps.forEach((step, index) => step.classList.toggle('is-lit', progress + .08 >= index / (steps.length - 1)));
  };
  addEventListener('scroll', () => { if (!frame) frame = requestAnimationFrame(updateScroll); }, { passive: true });
  addEventListener('resize', updateScroll, { passive: true });
  updateScroll();
  const facets = [...root.querySelectorAll('.facet-panel')];
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      const active = entries.filter((entry) => entry.isIntersecting).sort((a,b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!active) return;
      facets.forEach((facet) => facet.classList.toggle('is-active-facet', facet === active.target));
    }, { threshold: [.22,.45,.7] });
    facets.forEach((facet) => observer.observe(facet));
  } else facets.forEach((facet) => facet.classList.add('is-active-facet'));
  if (finePointer && !reduceMotion) {
    const cursor = document.createElement('div');
    cursor.className = 'motion-cursor';
    cursor.setAttribute('aria-hidden', 'true');
    cursor.innerHTML = '<span class="motion-cursor-core"></span><span class="motion-cursor-ring"></span>';
    root.appendChild(cursor);
    addEventListener('pointermove', (event) => {
      cursor.style.setProperty('--cursor-x', event.clientX + 'px');
      cursor.style.setProperty('--cursor-y', event.clientY + 'px');
      cursor.classList.add('is-visible');
      cursor.classList.toggle('is-interactive', Boolean(event.target.closest('a,button,input')));
    }, { passive: true });
  }
})();`;

export function ReferenceMotion() {
  return <script dangerouslySetInnerHTML={{ __html: motionScript }} />;
}
