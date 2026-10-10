// Repeats the sentence until one group covers the viewport, then sets the
// animation duration so the strip always travels at the same speed.

const SPEED_PX_PER_SECOND = 50;

export function initMarquee() {
  const track = document.querySelector('[data-marquee]');
  if (!track) return;

  const groups = [...track.children];
  const template = groups[0].firstElementChild;

  const fit = () => {
    const itemWidth = template.getBoundingClientRect().width;
    if (!itemWidth) return;

    const needed = Math.ceil(window.innerWidth / itemWidth) + 1;
    groups.forEach((group) => {
      while (group.children.length < needed) group.append(template.cloneNode(true));
      while (group.children.length > needed) group.lastElementChild.remove();
    });

    const groupWidth = groups[0].getBoundingClientRect().width;
    track.style.setProperty('--marquee-duration', `${Math.round(groupWidth / SPEED_PX_PER_SECOND)}s`);
  };

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(fit, 150);
  });

  fit();
  // Item width changes once the serif has loaded.
  document.fonts?.ready.then(fit);
}
