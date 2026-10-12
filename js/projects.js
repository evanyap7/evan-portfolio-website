// Behaviour for the project cards: a highlight that follows the cursor, and
// keeping a card on screen when opening it closes a taller one above.

export function initProjects() {
  const rows = [...document.querySelectorAll('.project__row')];

  rows.forEach((row) => {
    const card = row.parentElement;
    let opening = false;

    // Touch and pen have no hover, so only the mouse drives the highlight.
    row.addEventListener('pointermove', (event) => {
      if (event.pointerType !== 'mouse') return;
      const box = row.getBoundingClientRect();
      row.style.setProperty('--mx', `${event.clientX - box.left}px`);
      row.style.setProperty('--my', `${event.clientY - box.top}px`);
    });

    // Only react to a toggle the visitor caused, not the card open on load.
    row.addEventListener('click', () => { opening = !card.open; });
    card.addEventListener('toggle', () => {
      if (!opening || !card.open) return;
      opening = false;
      requestAnimationFrame(() => {
        const { top } = card.getBoundingClientRect();
        if (top < 90 || top > window.innerHeight * 0.5) card.scrollIntoView({ block: 'start' });
      });
    });
  });
}
