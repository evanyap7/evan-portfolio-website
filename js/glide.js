// The page's pace under a wheel or a trackpad: each notch carries the page a
// little less far than the browser would, and the page eases to a stop
// instead of jumping. Touch, the keys and the scrollbar keep the browser's
// own scrolling, and so does anything the page scrolls by itself (a link to
// a section, projects.js landing on a Mark): the glide lets go at once.

const PACE = 0.6;    // of the browser's distance for each notch
const EASE = 0.085;  // of the way still to go, each frame at 60 frames a second

// Whether something under the pointer would take this wheel itself.
const scrollsItself = (node, dy) => {
  for (let el = node; el && el !== document.body && el !== document.documentElement; el = el.parentElement) {
    const { overflowY } = getComputedStyle(el);
    if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 1) {
      if (dy < 0 ? el.scrollTop > 0 : el.scrollTop + el.clientHeight < el.scrollHeight - 1) return true;
    }
  }
  return false;
};

export function initGlide() {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const root = document.documentElement;
  let target = 0;
  let y = 0;          // where the glide last put the page
  let frame = 0;
  let last = 0;

  const stop = () => {
    cancelAnimationFrame(frame);
    frame = 0;
  };
  const step = (now) => {
    // Something else moved the page: it has the page now.
    if (Math.abs(window.scrollY - y) > 2) {
      stop();
      return;
    }
    const dt = last ? Math.min(64, now - last) : 1000 / 60;
    last = now;
    y += (target - y) * (1 - (1 - EASE) ** (dt * 0.06));
    if (Math.abs(target - y) < 0.5) y = target;
    // Instant: the page's own smooth scrolling would glide on top of this.
    window.scrollTo({ top: y, behavior: 'instant' });
    frame = y === target ? 0 : requestAnimationFrame(step);
  };

  window.addEventListener('wheel', (event) => {
    if (event.defaultPrevented || event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    // Behind the gate, under the open menu, or wherever the page is held still.
    if (root.classList.contains('gated') || getComputedStyle(root).overflowY === 'hidden') return;
    if (scrollsItself(event.target, event.deltaY)) return;
    let dy = event.deltaY;
    if (event.deltaMode === 1) dy *= 16;
    else if (event.deltaMode === 2) dy *= window.innerHeight;
    if (!frame) {
      target = window.scrollY;
      y = window.scrollY;
      last = 0;
    }
    target = Math.max(0, Math.min(root.scrollHeight - window.innerHeight, target + dy * PACE));
    event.preventDefault();
    if (!frame) frame = requestAnimationFrame(step);
  }, { passive: false });
}
