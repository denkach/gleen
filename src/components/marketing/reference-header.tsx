export function isHeaderScrolled(scrollY: number) {
  return scrollY > 18;
}

const headerScript = `(() => {
  const header = document.querySelector('.landing-reference .site-header');
  if (!header) return;
  let frame = 0;
  const update = () => header.classList.toggle('scrolled', window.scrollY > 18);
  const onScroll = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => { frame = 0; update(); });
  };
  update();
  window.addEventListener('scroll', onScroll, { passive: true });
})();`;

export function ReferenceHeaderBehavior() {
  return <script dangerouslySetInnerHTML={{ __html: headerScript }} />;
}
