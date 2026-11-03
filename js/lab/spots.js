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
    body.replaceChildren(spot.body.cloneNode(true));
    scene.lean(spot.anchor);
    if (!card.open) card.showModal();
  };

  // Each frame, every spot of the room the camera is in follows its object,
  // shown only where it lands inside that room's window (never over the
  // panel's words).
  const place = () => {
    spots.forEach((spot) => {
      const here = root.dataset.stop === spot.stop;
      let shown = false;
      if (here) {
        const p = scene.project(spot.anchor);
        const box = spot.frame?.getBoundingClientRect();
        shown = p.onScreen && (!box || (p.x >= box.left + 22 && p.x <= box.right - 22 && p.y >= box.top + 22 && p.y <= box.bottom - 22));
        if (shown) spot.button.style.transform = `translate(${Math.round(p.x)}px, ${Math.round(p.y)}px)`;
      }
      spot.button.classList.toggle('is-shown', shown);
    });
  };
  scene.onFrame(place);

  return {
    add({ id, label, stop, anchor, title: heading, body: words }) {
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
      spots.set(id, { button, anchor, stop, title: heading, body: words, frame: section.querySelector('[data-lab-frame]') });
      return button;
    },
    open,
    close() {
      if (card.open) card.close();
    },
  };
}
