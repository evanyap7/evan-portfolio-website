// The small motions that sit on top of the layout: titles whose words rise
// from behind a mask, the Experience timeline drawing down, and (with a
// mouse or trackpad only) the card spotlight and Contact's magnetic pills. With reduced motion none of it
// runs and every element rests in its final state; the CSS for each part
// is written inside prefers-reduced-motion: no-preference as well.

const REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)');
const FINE = window.matchMedia('(hover: hover) and (pointer: fine)');

// Wraps each word of a title in a mask and an inner span, keeping the text
// and the spaces between words where they were. The accent word in the
// serif counts last, so it arrives after the rest.
function split(title) {
  const words = [];
  const wrap = (content, serif) => {
    const mask = document.createElement('span');
    const inner = document.createElement('span');
    mask.className = serif ? 'word word--serif' : 'word';
    inner.className = 'word__in';
    inner.append(content);
    mask.append(inner);
    words.push({ inner, serif });
    return mask;
  };

  [...title.childNodes].forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const pieces = node.textContent.split(/(\s+)/).filter(Boolean);
      node.replaceWith(...pieces.map((piece) => (/^\s+$/.test(piece) ? ' ' : wrap(piece, false))));
    } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName !== 'BR') {
      const mask = wrap('', node.classList.contains('serif'));
      node.replaceWith(mask);
      mask.firstChild.append(node);
    }
  });

  const plain = words.filter((word) => !word.serif);
  [...plain, ...words.filter((word) => word.serif)]
    .forEach((word, i) => word.inner.style.setProperty('--i', String(i)));
  title.classList.add('split');
}

function initTitles() {
  const titles = [...document.querySelectorAll('.hero__title, .title, .project__title')];
  if (!titles.length) return;
  titles.forEach(split);

  // The hero is on screen at load, so its words rise straight away.
  const show = (title) => title.classList.add('is-in');
  const hero = titles.filter((title) => title.matches('.hero__title, .project__title'));
  requestAnimationFrame(() => requestAnimationFrame(() => hero.forEach(show)));

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      show(entry.target);
      observer.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -10% 0px' });
  titles.filter((title) => !hero.includes(title)).forEach((title) => observer.observe(title));
}

// Draws the timeline down as the Experience section scrolls past: --p is
// how far the reading line (60% down the screen) has travelled through it.
// The scroll listener is only attached while the timeline is near view.
function initTimeline() {
  const line = document.querySelector('[data-timeline]');
  if (!line) return;
  let frame = 0;
  const draw = () => {
    frame = 0;
    const box = line.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (window.innerHeight * 0.6 - box.top) / box.height));
    line.style.setProperty('--p', p.toFixed(4));
  };
  const queue = () => {
    if (!frame) frame = requestAnimationFrame(draw);
  };
  draw();
  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      window.addEventListener('scroll', queue, { passive: true });
      queue();
    } else {
      window.removeEventListener('scroll', queue);
      draw();
    }
  }, { rootMargin: '25% 0px' }).observe(line);
}

// Tracks the pointer over each card for the spotlight in figures.css.
function initSpotlight() {
  document.querySelectorAll('.work__card, a.card.next').forEach((card) => {
    let frame = 0;
    let x = 0;
    let y = 0;
    card.classList.add('spot');
    card.dataset.pointer = 'fine';
    card.addEventListener('pointermove', (event) => {
      const box = card.getBoundingClientRect();
      x = event.clientX - box.left;
      y = event.clientY - box.top;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        card.style.setProperty('--mx', `${x}px`);
        card.style.setProperty('--my', `${y}px`);
      });
    }, { passive: true });
  });
}

// Contact's pills lean up to 6px toward the pointer, and settle on leave.
function initMagnets() {
  const MAX = 6;
  document.querySelectorAll('.contact__links .pill, .contact__copy').forEach((pill) => {
    let frame = 0;
    let dx = 0;
    let dy = 0;
    const apply = () => {
      frame = 0;
      pill.style.transform = dx || dy ? `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px)` : '';
    };
    pill.classList.add('magnet');
    pill.dataset.pointer = 'fine';
    pill.addEventListener('pointermove', (event) => {
      const box = pill.getBoundingClientRect();
      const clamp = (value) => Math.max(-1, Math.min(1, value));
      dx = clamp((event.clientX - (box.left + box.width / 2)) / (box.width / 2)) * MAX;
      dy = clamp((event.clientY - (box.top + box.height / 2)) / (box.height / 2)) * MAX;
      if (!frame) frame = requestAnimationFrame(apply);
    }, { passive: true });
    pill.addEventListener('pointerleave', () => {
      dx = 0;
      dy = 0;
      if (!frame) frame = requestAnimationFrame(apply);
    });
  });
}

export function initMotion() {
  if (REDUCE.matches || !('IntersectionObserver' in window)) return;
  initTitles();
  initTimeline();
  if (FINE.matches) {
    initSpotlight();
    initMagnets();
  }
}
