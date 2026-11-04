// The things in the lab you can click: each is a real <button> in its section
// (so the tab order follows the page), held over its object in the room as the
// camera moves, and it opens one shared card with the object's story. Off its
// room a spot is invisible and lets clicks through, but keeps its place in the
// tab order: focusing it walks the camera back to its room.

const root = document.documentElement;

export function createSpots(lab) {
  const { scene } = lab;
  const spots = new Map();

  // The card: one modal dialog, filled for whichever spot opened it.
  const card = document.createElement('dialog');
  card.className = 'lab-card';
  card.setAttribute('aria-labelledby', 'lab-card-title');
  const title = document.createElement('h2');
  title.id = 'lab-card-title';
  title.className = 'lab-card__title';
  const body = document.createElement('div');
  body.className = 'lab-card__body';
  const shut = document.createElement('button');
  shut.type = 'button';
  shut.className = 'lab-card__close';
  shut.textContent = 'Close';
  shut.addEventListener('click', () => card.close());
  card.append(title, body, shut);
  // A click on the backdrop (outside the card's box) closes it too.
  card.addEventListener('click', (event) => {
    if (event.target !== card) return;
    const box = card.getBoundingClientRect();
    const inside = event.clientX >= box.left && event.clientX <= box.right && event.clientY >= box.top && event.clientY <= box.bottom;
    if (!inside) card.close();
  });
  document.body.append(card);

  let current = null;
  card.addEventListener('close', () => {
    scene.lean(null);
    const spot = current && spots.get(current);
    current = null;
    spot?.button.focus({ preventScroll: true });
  });

  const open = (id) => {
    const spot = spots.get(id);
    if (!spot) return;
    current = id;
    title.textContent = spot.title;
    // The bench's cards are holograms; every other thing's is a plain plate.
    card.classList.toggle('lab-card--holo', spot.variant === 'holo');
    body.replaceChildren(spot.body.cloneNode(true));
    scene.lean(spot.anchor);
    if (!card.open) card.showModal();
  };

  // Each frame, every spot of the room the camera is in follows its object,
  // shown only where it lands inside that room's window (never over the
  // panel's words).
  // Reads first, writes after, and each room's window measured once: with
  // fourteen spots on the shelf, a read after every write would force fourteen
  // layouts a frame.
  const place = () => {
    const rects = new Map();
    const rectOf = (element) => {
      if (!rects.has(element)) rects.set(element, element.getBoundingClientRect());
      return rects.get(element);
    };
    const pinned = root.classList.contains('shelf-pinned');
    const put = [];
    spots.forEach((spot) => {
      let shown = false;
      let at = null;
      if (root.dataset.stop === spot.stop) {
        const p = scene.project(spot.anchor);
        let box = spot.frame ? rectOf(spot.frame) : null;
        // A window as tall as the screen (the wide layout) is the whole right
        // side of the screen for as long as the camera holds in the section,
        // not only while the section's top is on screen: a long section keeps
        // its room, and its things, in reach as the panel scrolls.
        if (box && spot.frame.offsetHeight >= window.innerHeight - 1) {
          const sheet = rectOf(spot.section);
          box = { left: box.left, right: box.right, top: Math.max(0, sheet.top), bottom: Math.min(window.innerHeight, sheet.bottom) };
        }
        // A narrow screen pins the window to the top of the screen while the
        // shelf is held there (css/lab.css), so it is where it was at arrival.
        // The strip's own edge is the limit: an object on it may sit right at it.
        if (box && pinned && spot.stop === 'experience' && spot.frame.offsetHeight < window.innerHeight - 1) {
          box = { left: 0, right: window.innerWidth, top: spot.frame.offsetTop, bottom: spot.frame.offsetTop + spot.frame.offsetHeight + 22 };
        }
        shown = p.onScreen && (!box || (p.x >= box.left + 22 && p.x <= box.right - 22 && p.y >= box.top + 22 && p.y <= box.bottom - 22));
        if (shown) at = `translate(${Math.round(p.x)}px, ${Math.round(p.y)}px)`;
      }
      put.push([spot, shown, at]);
    });
    put.forEach(([spot, shown, at]) => {
      if (at && at !== spot.at) {
        spot.at = at;
        spot.button.style.transform = at;
      }
      if (shown !== spot.shown) {
        spot.shown = shown;
        spot.button.classList.toggle('is-shown', shown);
      }
    });
  };
  scene.onFrame(place);

  return {
    add({ id, label, stop, anchor, title: heading, body: words, variant = 'plain' }) {
      const section = document.getElementById(stop);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'lab-spot';
      button.setAttribute('aria-haspopup', 'dialog');
      button.dataset.spot = id;
      const ring = document.createElement('span');
      ring.className = 'lab-spot__ring';
      ring.setAttribute('aria-hidden', 'true');
      const name = document.createElement('span');
      name.className = 'lab-spot__label';
      name.textContent = label;
      button.append(ring, name);
      button.addEventListener('click', () => open(id));
      // Focus moves the page at once, as a browser's own focus scroll does;
      // the camera still glides there, as it trails the scroll.
      button.addEventListener('focus', () => {
        if (root.dataset.stop !== stop) lab.goToStop(stop, { instant: true });
      });
      section.append(button);
      spots.set(id, { button, section, anchor, stop, title: heading, body: words, variant, frame: section.querySelector('[data-lab-frame]') });
      return button;
    },
    open,
    close() {
      if (card.open) card.close();
    },
  };
}
