// The way in. On a first visit the main page opens dark: only the arc
// reactor, unpowered, and three ways to wake it: the Activate portfolio
// button, the microphone (say "EGO"), or typing "ego". Waking it
// powers the reactor on and the site builds in around it.
//
// The head script in index.html decides whether to gate before the first
// paint (the `gated` class): never with a link to a section (#work and so
// on), never twice in one browser session, and never without module
// support. It also lifts the gate by itself if this file has not taken
// over within a few seconds, so a failed script cannot lock anyone out.

const KEY = 'portfolio-on';
const WORD = 'ego';
// How speech recognition tends to write the wake word down.
const WAKE_WORD = /\b(ego|eggo|e\.? ?g\.? ?o)\b/i;
const root = document.documentElement;

// Runs fn once the site is awake: at once if it already is.
export function whenActive(fn) {
  if (!root.classList.contains('gated')) fn();
  else document.addEventListener('portfolio:activate', () => fn(), { once: true });
}

export function initGate() {
  const gate = document.querySelector('[data-gate]');
  if (!gate || !root.classList.contains('gated')) return;
  root.classList.add('gate-ready');

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const status = gate.querySelector('[data-gate-status]');
  const button = gate.querySelector('[data-gate-activate]');
  const mic = gate.querySelector('[data-gate-mic]');
  // Everything but the gate is out of reach until the site wakes.
  const asleep = [
    ...document.querySelectorAll('.skip-link, .nav, .menu, main > section:not(.hero), .footer'),
    ...document.querySelectorAll('.hero__name, .reactor, .reactor__panel, .hero__title, .hero__lede, .hero__actions, .hero__creds'),
  ];
  asleep.forEach((el) => { el.inert = true; });
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  let awake = false;
  let listening = null;
  const activate = () => {
    if (awake) return;
    awake = true;
    listening?.abort();
    try {
      sessionStorage.setItem(KEY, '1');
    } catch {
      // Storage can be blocked; the gate then shows again on the next visit.
    }
    asleep.forEach((el) => { el.inert = false; });
    root.classList.add('waking');
    // The reactor starts powering on now; the page follows it up.
    document.dispatchEvent(new Event('portfolio:waking'));
    window.setTimeout(() => {
      root.classList.remove('gated');
      document.dispatchEvent(new Event('portfolio:activate'));
    }, reduce ? 0 : 700);
    window.setTimeout(() => root.classList.remove('waking'), reduce ? 0 : 2600);
  };

  button.addEventListener('click', activate);

  // Typing the wake word works anywhere on the page.
  let typed = '';
  const onKey = (event) => {
    if (event.key.length !== 1) return;
    typed = (typed + event.key.toLowerCase()).slice(-WORD.length);
    if (typed === WORD) {
      document.removeEventListener('keydown', onKey);
      activate();
    }
  };
  document.addEventListener('keydown', onKey);

  // Voice: the browser's own speech recognition, where there is one
  // (Chrome, Edge and Safari; not Firefox). It only starts on a press of
  // the microphone button, and stops after ten seconds.
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition || !mic) return;
  mic.hidden = false;
  const say = (text) => { status.textContent = text; };
  mic.addEventListener('click', () => {
    if (listening) {
      listening.abort();
      return;
    }
    const rec = new Recognition();
    rec.lang = 'en-US';
    rec.interimResults = true;
    rec.continuous = true;
    rec.maxAlternatives = 3;
    listening = rec;
    mic.setAttribute('aria-pressed', 'true');
    say('Listening. Say “EGO”.');
    const stop = window.setTimeout(() => rec.stop(), 10000);
    rec.onresult = (event) => {
      const heard = [...event.results].flatMap((result) => [...result].map((alt) => alt.transcript)).join(' ');
      if (WAKE_WORD.test(heard)) {
        say('Voice recognised.');
        activate();
      }
    };
    rec.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') say('Microphone blocked. Use Activate instead.');
      else if (event.error === 'no-speech') say('Didn’t catch that. Try again.');
    };
    rec.onend = () => {
      window.clearTimeout(stop);
      listening = null;
      mic.setAttribute('aria-pressed', 'false');
      if (!awake && /Listening/.test(status.textContent)) say('Didn’t catch that. Try again.');
    };
    try {
      rec.start();
    } catch {
      listening = null;
      mic.setAttribute('aria-pressed', 'false');
      say('Voice is unavailable here. Use Activate instead.');
    }
  });
}
