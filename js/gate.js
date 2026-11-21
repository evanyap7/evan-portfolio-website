// The site used to open behind a gate: dark, with the arc reactor as the way
// in. It no longer does; every visit opens on the content, and the reactor in
// the hero is a toy (reactor.js). These exports stay because other modules
// still import them: the reactor's charge timings, and `whenActive`, which
// once waited for the gate and now runs its callback at once.

// How long a hold takes to charge the reactor to full, and how fast the
// charge drains when it is let go early (in full charges a second).
export const CHARGE_S = 1.4;
export const DRAIN_PER_S = 2.2;

export function whenActive(fn) {
  fn();
}

export function initGate() {}
