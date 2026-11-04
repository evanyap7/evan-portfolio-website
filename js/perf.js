// Keeps the 3D scenes smooth on whatever machine opens the site. Each scene
// hands over a ladder of quality levels (best first); this watches how long
// real frames take and steps down the ladder while they run slow. It only ever
// steps down, so quality cannot flap, and it will not go below `floor` unless
// frames are very slow: a 30 Hz screen (low-power mode) also shows ~33 ms
// frames, and is not a reason to blur the picture.

const WINDOW = 40; // frames judged at once
const SETTLE = 12; // frames ignored after a change (shader compiles, resizes)
const SLOW = 21; // ms: under about 48 fps
const VERY_SLOW = 45;

// A small or old machine starts a rung or two down, before it has stuttered.
export function startingLevel(levels) {
  const cores = navigator.hardwareConcurrency || 8;
  const memory = navigator.deviceMemory || 8;
  const weak = cores <= 2 || memory <= 2 ? 2 : cores <= 4 || memory <= 4 ? 1 : 0;
  return Math.min(weak, levels.length - 1);
}

export function createGovernor(levels, { level = 0, floor = levels.length - 1, onLevel }) {
  let current = level;
  let sum = 0;
  let count = 0;
  let skip = SETTLE;
  return {
    get level() {
      return current;
    },
    // One frame's interval in ms (the time since the previous drawn frame).
    note(ms) {
      if (ms > 250) { // a hidden tab, a debugger: not a measure of the scene
        sum = 0;
        count = 0;
        skip = SETTLE;
        return;
      }
      if (skip > 0) {
        skip -= 1;
        return;
      }
      sum += ms;
      count += 1;
      if (count < WINDOW) return;
      const average = sum / count;
      sum = 0;
      count = 0;
      const room = current < floor || (average > VERY_SLOW && current < levels.length - 1);
      if (average > SLOW && room) {
        current += 1;
        skip = SETTLE;
        onLevel?.(levels[current], current);
      }
    },
  };
}
