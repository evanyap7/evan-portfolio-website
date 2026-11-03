// The lab's camera rail: pure maths that turns the page's scroll position into a place
// along the camera path. No DOM, no three.js, so it runs under node for the unit tests.

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
// Clamped as well, so rounding near t = 1 cannot overshoot and make the rail step back.
const smootherstep = (t) => clamp01(t * t * t * (t * (t * 6 - 15) + 10));

// Maps p in [0,1] to [0, n-1], resting on each integer for `hold` of its share and
// easing between neighbours, so a scrolled row settles on one bay at a time.
export function holds(p, n, hold = 0.55) {
  if (n <= 1) return 0;
  const s = clamp01(p) * (n - 1);
  const i = Math.min(Math.floor(s), n - 2);
  const t = clamp01((s - i - hold / 2) / (1 - hold));
  return i + smootherstep(t);
}

// Frame-rate independent ease toward a target; dt in seconds.
export function damp(current, target, rate, dt) {
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}

// stops: each section's {top, height} in page pixels, in rail order. Section k holds the
// camera while it fills the screen, then the camera travels to k+1 until that section's
// top reaches the top of the screen. The row stop (the suits) takes two curve points, its
// first and last bay, and walks the bays during its hold.
export function railPosition(scrollY, vh, stops, { maxScroll, row } = {}) {
  const n = stops.length;
  const last = n - 1;
  const y = Math.max(0, Math.min(scrollY, maxScroll ?? Infinity));
  const index = (k) => k + (row && k > row.stop ? 1 : 0);
  const start = stops.map((s) => s.top);
  // A page too short to bring the last section to the top still has to end on it.
  if (maxScroll != null && start[last] > maxScroll) start[last] = Math.max(start[last - 1] ?? 0, maxScroll);
  const end = stops.map((s, k) => Math.min(Math.max(start[k], s.top + s.height - vh), start[k + 1] ?? Infinity));

  const held = (k) => {
    if (!row || k !== row.stop) return { u: index(k), stop: k, bay: -1 };
    const len = end[k] - start[k];
    const bay = holds(len > 0 ? (y - start[k]) / len : 0, row.count);
    return { u: index(k) + bay / Math.max(1, row.count - 1), stop: k, bay };
  };

  if (y <= start[0]) return held(0);
  for (let k = 0; k < last; k++) {
    if (y < start[k + 1]) {
      if (y <= end[k]) return held(k);
      const from = index(k) + (row && k === row.stop ? 1 : 0);
      const e = smootherstep(clamp01((y - end[k]) / (start[k + 1] - end[k])));
      return { u: from + e * (index(k + 1) - from), stop: e < 0.5 ? k : k + 1, bay: -1 };
    }
  }
  return held(last);
}
