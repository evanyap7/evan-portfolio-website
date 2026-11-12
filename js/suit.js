// The suit in the Projects chapter is the Hall of Armor's own 3D model
// (hall-scene.js), fetched once the opener is near and drawn only while it is
// on screen. It arrives as code: the characters of hall-stage.js, the file
// that draws it, are set out as a listing, then fly line by line to the suit's
// surface, feet first. When the last one lands the model takes over and the
// code lets go. Drag the suit round, or use the arrow keys; let go and it
// coasts to a stop. projects.js says which Mark to form (the `mark` event).

import { whenActive } from './gate.js';

const reduce = matchMedia('not all').matches;
const coarse = matchMedia('(pointer: coarse)').matches;
const narrow = matchMedia('(max-width: 1023px)');
const webgl2 = (() => { try { return Boolean(document.createElement('canvas').getContext('webgl2')); } catch { return false; } })();

// The Hall's framing (js/hall-scene.js, js/hall-stage.js): the camera sees VIEW
// world units top to bottom; a suit is TALL, feet at FEET, and grows in from 0.9.
const VIEW = 2.85;
const TALL = 2.08;
const LAND = 2.0;   // seconds until the last character has landed

const VERTEX = `
attribute vec3 aStart;
attribute vec4 aData;   // order of departure 0..1, character, random 0..1, when it is typed
uniform float uT;
uniform float uOut;
uniform float uSize;
uniform float uHalf;
varying float vGlyph;
varying float vLand;
varying float vFlash;
varying float vAlpha;
void main() {
  float depart = 0.42 + aData.x * 0.78 + aData.z * 0.06;
  float f = clamp((uT - depart) / 0.72, 0.0, 1.0);
  float e = f < 0.5 ? 4.0 * f * f * f : 1.0 - pow(-2.0 * f + 2.0, 3.0) / 2.0;
  vec3 p = mix(aStart, position, e);
  float arc = sin(3.14159 * e);
  float a = arc * (0.5 + aData.z * 0.9);   // each one swings round the suit on its way in
  p.xz = mat2(cos(a), -sin(a), sin(a), cos(a)) * p.xz;
  p.z += arc * (0.35 + aData.z * 0.5);
  vec3 away = normalize(vec3(position.x, 0.0, position.z) + vec3(0.0001));
  p += (away * 0.14 + vec3(0.0, 0.1, 0.0)) * uOut * (0.4 + aData.z);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * (1.0 - 0.4 * uOut) * projectionMatrix[1][1] * uHalf / -mv.z;
  float flying = step(0.02, f) * step(f, 0.98);
  vGlyph = mod(aData.y + flying * floor(uT * 16.0) * floor(aData.z * 40.0 + 1.0), 94.0);
  float since = uT - depart - 0.72;
  vLand = e;
  vFlash = since > 0.0 ? exp(-since * 7.0) : 0.0;
  float typed = smoothstep(aData.w, aData.w + 0.1, uT);
  float shimmer = 0.86 + 0.14 * sin(uT * 9.0 + aData.z * 40.0);
  vAlpha = typed * mix(0.6, 0.95, e) * shimmer * (1.0 - uOut);
}`;
const FRAGMENT = `
uniform sampler2D uAtlas;
uniform vec3 uCode;
uniform vec3 uSuit;
varying float vGlyph;
varying float vLand;
varying float vFlash;
varying float vAlpha;
void main() {
  float i = floor(vGlyph + 0.5);
  vec2 cell = vec2(mod(i, 10.0), floor(i / 10.0));
  vec2 uv = vec2((cell.x + gl_PointCoord.x) / 10.0, 1.0 - (cell.y + gl_PointCoord.y) / 10.0);
  float ink = texture2D(uAtlas, uv).a * vAlpha;
  if (ink < 0.01) discard;
  gl_FragColor = vec4(mix(uCode, uSuit, vLand) + vFlash * 0.55, ink);
}`;

function rgb(h, s, l) {   // hsl to plain sRGB numbers, as the page's own colours are written
  const a = s * Math.min(l, 1 - l);
  const f = (n) => { const k = (n + h / 30) % 12; return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
  return [f(0), f(8), f(4)];
}

// The source as rows of characters, at most `cols` across, indents kept.
function listing(source, count, cols, from) {
  const lines = source.split('\n').map((text) => text.replace(/\t/g, '  ').trimEnd()).filter((text) => text.trim().length > 2);
  const cells = [];
  let row = 0;
  if (!lines.length) return { cells, rows: 0 };
  for (let i = from % lines.length; cells.length < count && row < 400; i = (i + 1) % lines.length, row++) {
    const text = lines[i];
    const indent = Math.min(12, text.length - text.trimStart().length);
    const body = text.trimStart().slice(0, cols - indent);
    for (let k = 0; k < body.length && cells.length < count; k++) {
      const code = body.charCodeAt(k);
      if (code > 32 && code < 127) cells.push({ row, col: indent + k, code });
    }
  }
  return { cells, rows: row };
}

// `count` points spread evenly over the model's surface, lowest first, in the
// stage's own space (feet at FEET, TALL high).
function surface(THREE, stage, pieces, count) {
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  const corners = [];
  const upTo = [];
  let total = 0;
  for (const piece of pieces) {
    const at = piece.geometry.attributes.position;
    const index = piece.geometry.index;
    const n = index ? index.count : at.count;
    for (let i = 0; i + 2 < n; i += 3) {
      a.fromBufferAttribute(at, index ? index.getX(i) : i).applyMatrix4(piece.matrix);
      b.fromBufferAttribute(at, index ? index.getX(i + 1) : i + 1).applyMatrix4(piece.matrix);
      c.fromBufferAttribute(at, index ? index.getX(i + 2) : i + 2).applyMatrix4(piece.matrix);
      const area = ab.subVectors(b, a).cross(ac.subVectors(c, a)).length() / 2;
      if (!(area > 0)) continue;
      total += area;
      upTo.push(total);
      corners.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    }
  }
  if (!upTo.length) return null;
  const k = TALL / 2;
  const out = [];
  for (let i = 0; i < count; i++) {
    const pick = Math.random() * total;
    let lo = 0;
    let hi = upTo.length - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (upTo[mid] < pick) lo = mid + 1; else hi = mid; }
    let u = Math.random();
    let v = Math.random();
    if (u + v > 1) { u = 1 - u; v = 1 - v; }
    const o = lo * 9;
    const w = 1 - u - v;
    out.push([
      (corners[o] * w + corners[o + 3] * u + corners[o + 6] * v) * k,
      (corners[o + 1] * w + corners[o + 4] * u + corners[o + 7] * v) * k + stage.FEET,
      (corners[o + 2] * w + corners[o + 5] * u + corners[o + 8] * v) * k,
    ]);
  }
  return out.sort((p, q) => p[1] - q[1]);
}

// The code layer: one canvas across the opener's stage, with the Hall's camera
// widened so that the figure's box frames exactly what the Hall's canvas frames.
function createCode(THREE, stage, canvas, fig, stageEl, source) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
  renderer.setClearColor(0x000000, 0);
  const dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2);
  renderer.setPixelRatio(dpr);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
  camera.position.set(0, 0, VIEW / 2 / Math.tan(THREE.MathUtils.degToRad(14)));

  const CELL = 64;
  const sheet = document.createElement('canvas');
  sheet.width = sheet.height = CELL * 10;
  const pen = sheet.getContext('2d');
  pen.fillStyle = '#fff';
  pen.font = `600 ${CELL * 0.8}px ui-monospace, "SF Mono", Menlo, Consolas, monospace`;
  pen.textAlign = 'center';
  pen.textBaseline = 'middle';
  for (let i = 0; i < 94; i++) pen.fillText(String.fromCharCode(33 + i), (i % 10 + 0.5) * CELL, (Math.floor(i / 10) + 0.5) * CELL);
  const atlas = new THREE.CanvasTexture(sheet);

  const uniforms = {
    uT: { value: 0 }, uOut: { value: 0 }, uSize: { value: 0.05 }, uHalf: { value: 1 }, uAtlas: { value: atlas },
    uCode: { value: new THREE.Vector3(...rgb(205, 0.95, 0.72)) }, uSuit: { value: new THREE.Vector3(1, 1, 1) },
  };
  const material = new THREE.ShaderMaterial({ uniforms, vertexShader: VERTEX, fragmentShader: FRAGMENT, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending });

  let points = null;
  let raf = 0;
  let t0 = 0;
  let rate = 1;
  let landed = null;      // resolves the running flight
  let released = 0;       // when the code let go
  let width = 0;
  let height = 0;

  function layout() {
    const f = fig.getBoundingClientRect();
    const s = stageEl.getBoundingClientRect();
    if (!f.width || !f.height || !s.width || !s.height) return null;
    const w = Math.round(s.width);
    const h = Math.round(s.height);
    if (w !== width || h !== height) { width = w; height = h; renderer.setSize(w, h, false); }
    camera.aspect = f.width / f.height;
    camera.setViewOffset(f.width, f.height, s.left - f.left, s.top - f.top, s.width, s.height);
    uniforms.uHalf.value = h * dpr / 2;
    return { f, s };
  }

  function clear() {
    cancelAnimationFrame(raf);
    raf = 0;
    if (points) { scene.remove(points); points.geometry.dispose(); points = null; }
    renderer.clear();
    landed?.(false);
    landed = null;
  }

  function tick(now) {
    raf = requestAnimationFrame(tick);
    if (!layout()) return;
    uniforms.uT.value = (now - t0) / 1000 * rate;
    if (landed && uniforms.uT.value >= LAND) { landed(true); landed = null; }
    if (released) {
      // The model turns to its resting angle and grows the last tenth as it takes over; the code goes with it.
      const s = (now - released) / 1000;
      uniforms.uOut.value = Math.min(1, s / 0.45);
      points.rotation.y = 0.2 * (1 - Math.exp(-6 * s));
      points.scale.setScalar(0.9 + 0.1 * (1 - (1 - Math.min(1, s / 0.6)) ** 3));
      if (s >= 0.45) { clear(); return; }
    }
    renderer.render(scene, camera);
  }

  return {
    // Sets the listing out and flies it onto the model. Resolves true once the
    // last character has landed, false if another flight replaced this one.
    play(pieces, hue, from, quick) {
      clear();
      const box = layout();
      const count = coarse || narrow.matches ? 1200 : 2200;
      const targets = box && surface(THREE, stage, pieces, count);
      if (!targets) return Promise.resolve(false);
      const perUnit = box.f.height / VIEW;   // CSS pixels to a world unit
      const size = (narrow.matches ? 11 : 13) / perUnit;
      const wide = box.s.width / perUnit * (narrow.matches ? 0.88 : 0.44);
      const cols = Math.max(20, Math.min(92, Math.floor(wide / (size * 0.5))));
      const { cells, rows } = listing(source, count, cols, from);
      if (cells.length < count) return Promise.resolve(false);
      // The listing sits left of the suit on a wide screen, and over it on a narrow one.
      const cx = ((narrow.matches ? box.s.left + box.s.width / 2 : box.s.left + box.s.width * 0.27) - (box.f.left + box.f.width / 2)) / perUnit;
      const cy = -((box.s.top + box.s.height / 2) - (box.f.top + box.f.height / 2)) / perUnit;
      const position = new Float32Array(count * 3);
      const start = new Float32Array(count * 3);
      const data = new Float32Array(count * 4);
      for (let i = 0; i < count; i++) {
        const cell = cells[i];
        position.set(targets[i], i * 3);
        start[i * 3] = (cx + (cell.col - cols / 2) * size * 0.5) / 0.9;
        start[i * 3 + 1] = (cy + (rows / 2 - cell.row) * size * 1.05) / 0.9;
        start[i * 3 + 2] = -0.2;
        data[i * 4] = i / (count - 1);
        data[i * 4 + 1] = cell.code - 33;
        data[i * 4 + 2] = Math.random();
        data[i * 4 + 3] = cell.row * 0.011 + cell.col * 0.0012;
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
      geometry.setAttribute('aStart', new THREE.BufferAttribute(start, 3));
      geometry.setAttribute('aData', new THREE.BufferAttribute(data, 4));
      points = new THREE.Points(geometry, material);
      points.frustumCulled = false;
      points.scale.setScalar(0.9);
      scene.add(points);
      uniforms.uSize.value = size;
      uniforms.uSuit.value.set(...rgb(hue, 0.85, 0.64));
      uniforms.uOut.value = 0;
      released = 0;
      rate = quick ? 1.3 : 1;
      t0 = performance.now();
      raf = requestAnimationFrame(tick);
      return new Promise((resolve) => { landed = resolve; });
    },
    release() { if (points && !released) released = performance.now(); },
    clear,
  };
}

function mountSuit(fig) {
  const canvas = fig.querySelector('canvas');
  const stageEl = fig.closest('.opener__stage');
  let want = { spec: JSON.parse(fig.dataset.suit), hue: Number(fig.dataset.tint), line: Number(fig.dataset.line) };
  let hall = null;
  let stage = null;
  let code = null;
  let visible = false;
  let formed = false;    // the model stands and may run
  let pending = true;    // the wanted suit has not been assembled yet
  let run = 0;
  let first = true;

  const sync = () => {
    if (!hall || reduce) return;
    if (formed && visible && !document.hidden) hall.start(); else hall.stop();
  };

  async function form() {
    pending = false;
    const my = ++run;
    const { spec, hue, line } = want;
    formed = false;
    hall.stop();
    fig.classList.remove('live');
    fig.classList.add('forming');
    const prepared = Promise.resolve(hall.prepare(spec)).catch(() => {});
    if (code && !reduce) {
      try {
        const model = await stage.loadModel(spec.model);
        if (my !== run) return;
        await code.play(model.pieces, hue, line, !first);
      } catch { /* no code: the model simply appears */ }
      if (my !== run) return;
    }
    await prepared;
    if (my !== run) return;
    const shown = await Promise.resolve(hall.setSuit(spec, { instant: reduce })).then((ok) => ok !== false, () => false);
    if (my !== run) return;
    fig.classList.remove('forming');
    if (!shown) { code?.clear(); return; }   // the still stays, where there is one
    fig.classList.add('live');
    code?.release();
    formed = true;
    sync();
    if (first) {
      first = false;
      fig.tabIndex = 0;
      fig.setAttribute('role', 'group');
      fig.setAttribute('aria-label', '3D model of this project’s suit. Left and right arrow keys turn it.');
    }
  }
  const tryForm = () => { if (hall && visible && pending) form(); };

  const load = () => Promise.all([import('./hall-scene.js'), import('./hall-stage.js'), import('three'), fetch(new URL('./hall-stage.js', import.meta.url)).then((r) => (r.ok ? r.text() : '')).catch(() => '')]).then(([scene, stageModule, THREE, source]) => {
    stage = stageModule;
    hall = scene.createHall(canvas);
    const fit = () => {
      const box = fig.getBoundingClientRect();
      if (box.width && box.height) hall.resize(Math.round(box.width), Math.round(box.height));
    };
    fit();
    new ResizeObserver(fit).observe(fig);
    if (!reduce) {
      try { code = createCode(THREE, stage, stageEl.querySelector('.opener__code'), fig, stageEl, source || VERTEX + FRAGMENT); } catch { code = null; }
    }
    document.addEventListener('visibilitychange', sync);
    tryForm();
  }).catch(() => { hall?.stop(); hall = null; });   // the still stays

  document.addEventListener('mark', (event) => {
    want = event.detail;
    pending = true;
    if (hall) { run++; code?.clear(); formed = false; hall.stop(); fig.classList.remove('live'); fig.classList.add('forming'); }
    tryForm();
  });

  const TURN_PER_PX = 0.012;
  let grab = null;
  fig.addEventListener('pointerdown', (event) => {
    if (!hall || !formed || event.button !== 0) return;
    grab = { x: event.clientX, lx: event.clientX, t: performance.now(), moved: false };
    hall.state.held = true;
    hall.state.spin = 0;
    fig.setPointerCapture(event.pointerId);
  });
  fig.addEventListener('pointermove', (event) => {
    if (!hall || !formed) return;
    if (event.pointerType !== 'touch') {
      const box = fig.getBoundingClientRect();
      hall.state.tx = ((event.clientX - box.left) / box.width - 0.5) * 2;
      hall.state.ty = ((event.clientY - box.top) / box.height - 0.5) * 2;
    }
    if (!grab || (!grab.moved && Math.abs(event.clientX - grab.x) < 6)) return;
    grab.moved = true;
    fig.classList.add('turned');
    const now = performance.now();
    const turn = (event.clientX - grab.lx) * TURN_PER_PX;
    hall.turn(turn);
    hall.state.spin = turn / Math.max(0.008, (now - grab.t) / 1000);
    grab.lx = event.clientX;
    grab.t = now;
  });
  const letGo = () => {
    if (!grab) return;
    const paused = performance.now() - grab.t > 120;   // a pause before letting go leaves it still
    grab = null;
    if (!hall) return;
    hall.state.held = false;
    hall.state.spin = paused ? 0 : Math.max(-9, Math.min(9, hall.state.spin));
  };
  fig.addEventListener('pointerup', letGo);
  fig.addEventListener('pointercancel', letGo);
  fig.addEventListener('lostpointercapture', letGo);
  fig.addEventListener('pointerleave', () => { if (hall) { hall.state.tx = 0; hall.state.ty = 0; } });
  fig.addEventListener('keydown', (event) => {
    if (!hall || !formed || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
    event.preventDefault();
    fig.classList.add('turned');
    hall.turn((event.key === 'ArrowLeft' ? -1 : 1) * 0.3);
  });

  // Fetch when the opener is near; assemble once enough of the figure shows.
  const near = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    near.disconnect();
    load();
  }, { rootMargin: '700px' });
  near.observe(fig);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting && entry.intersectionRatio >= 0.3;
    sync();
    tryForm();
  }, { threshold: [0, 0.3] }).observe(fig);
}

// Without WebGL 2 the still stays (Mark II's; the others show their name alone).
export function initSuit() {
  const figure = document.querySelector('[data-suit]');
  if (!figure || !webgl2 || !('IntersectionObserver' in window)) return;
  whenActive(() => mountSuit(figure));
}
