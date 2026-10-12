// Marks the nav link for the section in view with aria-current, so the
// header shows where you are. Links without a matching section are ignored.

export function initScrollspy() {
  const links = [...document.querySelectorAll('.site-nav__text[href^="#"]')];
  const entries = links
    .map((link) => ({ link, section: document.querySelector(link.getAttribute('href')) }))
    .filter((entry) => entry.section);
  if (!entries.length) return;

  const setCurrent = (current) => {
    entries.forEach(({ link }) => {
      if (link === current) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  };

  // A section counts as current while it covers the line just under the header.
  const observer = new IntersectionObserver((changes) => {
    changes.forEach((change) => {
      const entry = entries.find(({ section }) => section === change.target);
      if (change.isIntersecting) setCurrent(entry.link);
      else if (entry.link.getAttribute('aria-current')) setCurrent(null);
    });
  }, { rootMargin: '-90px 0px -85% 0px' });

  entries.forEach(({ section }) => observer.observe(section));
}
