// The cartoon in About waves once the first time it comes into view, and
// again when it is hovered or tapped. The wave itself is CSS, keyed to
// .is-waving; this adds the class and later rewinds those same animations.
// With reduced motion there are no animations to find and nothing happens.

const WAVE = ['wave-arm', 'wave-hand', 'wave-head', 'wave-lines'];

export function initWave() {
  const figure = document.querySelector('[data-wave]');
  if (!figure) return;

  const start = () => figure.classList.add('is-waving');

  const again = () => {
    if (!figure.classList.contains('is-waving')) {
      start();
      return;
    }
    if (!figure.getAnimations) return;
    const parts = figure.getAnimations({ subtree: true })
      .filter((animation) => WAVE.includes(animation.animationName));
    // Let a wave finish before starting another.
    if (parts.some((animation) => animation.playState !== 'finished')) return;
    parts.forEach((animation) => {
      animation.currentTime = 0;
      animation.play();
    });
  };

  figure.addEventListener('pointerenter', again);
  figure.addEventListener('pointerdown', again);

  if (!('IntersectionObserver' in window)) {
    start();
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    observer.disconnect();
    start();
  }, { threshold: 0.5 });
  observer.observe(figure);
}
