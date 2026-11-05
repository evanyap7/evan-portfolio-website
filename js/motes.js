// Dust in the workshop's air, drawn over the shot (js/lab.js). Each mote
// rises slowly, sways, and turns in the light, so it glints and fades; the
// pointer is a draught that parts them. Cool motes in the cool rooms, warm
// ones at Contact's desk lamp. A 2D canvas, still while the tab is hidden;
// never made under reduced motion.

const root = document.documentElement;
const PART = 140; // how near the pointer has to be to move a mote, px

// One soft round glint, drawn once and stamped for every mote.
function sprite(hue, sat, light) {
  const size = 32;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const glow = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  glow.addColorStop(0, `hsl(${hue} ${sat}% ${light}% / 1)`);
  glow.addColorStop(0.25, `hsl(${hue} ${sat}% ${light}% / 0.55)`);
  glow.addColorStop(1, `hsl(${hue} ${sat}% ${light}% / 0)`);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}

export function createMotes(host) {
  const canvas = document.createElement('canvas');
  canvas.className = 'scene__motes';
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  host.append(canvas);

  const cool = sprite(195, 70, 86);
  const warm = sprite(36, 90, 78);
  let w = 0;
  let h = 0;
  const size = () => {
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    w = host.clientWidth;
    h = host.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  size();
  window.addEventListener('resize', size);

  const spawn = (anywhere) => ({
    x: Math.random() * w,
    y: anywhere ? Math.random() * h : h + 12,
    // Most are specks; a few are near the lens and larger.
    r: 2 + Math.random() ** 3 * 9,
    rise: 5 + Math.random() * 14,
    sway: 6 + Math.random() * 14,
    swayRate: 0.15 + Math.random() * 0.35,
    phase: Math.random() * Math.PI * 2,
    glint: 0.5 + Math.random() * 1.2,
    vx: 0,
    vy: 0,
  });
  const motes = Array.from({ length: w < 720 ? 34 : 80 }, () => spawn(true));

  let px = -1e4;
  let py = -1e4;
  window.addEventListener('pointermove', (event) => {
    px = event.clientX;
    py = event.clientY;
  }, { passive: true });
  root.addEventListener('pointerleave', () => {
    px = -1e4;
    py = -1e4;
  });

  let warmth = 0;
  let last = 0;
  let frame = 0;
  const draw = (now) => {
    frame = requestAnimationFrame(draw);
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0);
    last = now;
    const t = now / 1000;
    warmth += ((root.dataset.stop === 'contact' ? 1 : 0) - warmth) * Math.min(1, dt * 2);
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    motes.forEach((mote) => {
      // The draught: a push straight away from the pointer, strongest at it.
      const dx = mote.x - px;
      const dy = mote.y - py;
      const d = Math.hypot(dx, dy);
      if (d < PART && d > 0.01) {
        const push = (1 - d / PART) * 260 * dt;
        mote.vx += (dx / d) * push;
        mote.vy += (dy / d) * push;
      }
      mote.vx *= 1 - Math.min(1, dt * 1.6);
      mote.vy *= 1 - Math.min(1, dt * 1.6);
      mote.x += (Math.sin(t * mote.swayRate + mote.phase) * mote.sway * 0.4 + mote.vx * 60) * dt;
      mote.y += (-mote.rise + mote.vy * 60) * dt;
      if (mote.y < -16 || mote.x < -24 || mote.x > w + 24) Object.assign(mote, spawn(false));

      // It glints as it turns, and glints brighter near the pointer's light.
      const turn = 0.5 + 0.5 * Math.sin(t * mote.glint + mote.phase);
      const lit = d < 260 ? 1 + (1 - d / 260) * 1.4 : 1;
      const alpha = Math.min(1, (0.16 + turn * 0.5) * lit * (mote.r > 6 ? 0.5 : 1));
      const r = mote.r;
      ctx.globalAlpha = alpha * (1 - warmth);
      if (ctx.globalAlpha > 0.01) ctx.drawImage(cool, mote.x - r, mote.y - r, r * 2, r * 2);
      ctx.globalAlpha = alpha * warmth;
      if (ctx.globalAlpha > 0.01) ctx.drawImage(warm, mote.x - r, mote.y - r, r * 2, r * 2);
    });
    ctx.globalAlpha = 1;
  };

  const sync = () => {
    if (document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
    } else if (!frame) {
      last = 0;
      frame = requestAnimationFrame(draw);
    }
  };
  document.addEventListener('visibilitychange', sync);
  sync();
}
