// Splits a line of text into words, or letters, so CSS can bring them in one
// at a time once reveal.js marks the line visible. Screen readers get the
// original sentence; the animated copy is hidden from them.

export function initKinetic() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('[data-kinetic]').forEach(split);
}

function split(target) {
  const byLetter = target.dataset.kinetic === 'letters';
  let index = 0;

  const piece = (text) => {
    const span = document.createElement('span');
    span.textContent = text;
    span.style.setProperty('--i', index++);
    return span;
  };

  const spoken = document.createElement('span');
  spoken.className = 'visually-hidden';
  spoken.textContent = target.textContent.replace(/\s+/g, ' ').trim();

  const shown = document.createElement('span');
  shown.setAttribute('aria-hidden', 'true');
  shown.append(...target.childNodes);

  // Text nodes are collected first because wrapping them changes the tree.
  const walker = document.createTreeWalker(shown, NodeFilter.SHOW_TEXT);
  const texts = [];
  while (walker.nextNode()) texts.push(walker.currentNode);

  texts.forEach((node) => {
    const parts = node.textContent.split(/(\s+)/).filter(Boolean).map((part) => {
      if (!part.trim()) return ' ';
      const word = document.createElement('span');
      word.className = 'kinetic__word';
      word.append(...(byLetter ? [...part].map(piece) : [piece(part)]));
      return word;
    });
    node.replaceWith(...parts);
  });

  target.replaceChildren(spoken, shown);
}
