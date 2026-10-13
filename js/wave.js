// Lets the cartoon in the hero wave again when it is hovered or tapped. The
// first wave is plain CSS, so this only rewinds those same animations. With
// reduced motion there are none to find and nothing happens.

const WAVE = ['wave-arm', 'wave-hand', 'wave-head', 'wave-lines'];

export function initWave() {
  const figure = document.querySelector('[data-wave]');
  if (!figure?.getAnimations) return;

  const wave = () => {
    const parts = figure.getAnimations({ subtree: true })
      .filter((animation) => WAVE.includes(animation.animationName));
    // Let a wave finish before starting another.
    if (parts.some((animation) => animation.playState !== 'finished')) return;

    parts.forEach((animation) => {
      // Skip the delay that holds the first wave back until the headline lands.
      animation.currentTime = animation.effect.getComputedTiming().delay;
      animation.play();
    });
  };

  figure.addEventListener('pointerenter', wave);
  figure.addEventListener('pointerdown', wave);
}
