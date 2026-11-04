// The lab's renderer and camera. One canvas, fixed behind the whole page; the
// camera walks a path through the room as the visitor scrolls, and frames each
// stop in that section's window (its data-lab-frame element), so the 3D thing a
// section talks about sits beside its text, not under it.

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { lens } from './lens.js';
import { createMaterials } from './materials.js';
import { createRoom, VIEWS, DOORWAY_BEND } from './room.js';
import { damp } from './rail.js';
import { createGovernor, startingLevel } from '../perf.js';

const ROW = 2; // the stop that takes two points on the path: the suits, first bay to last
const HALF_FOV = Math.tan((20 * Math.PI) / 180); // half the frame's short side spans 20°
const LEAN = 0.15;
// Where each stop's group stands, and so where its objects are placed from.
const MARK = { about: 'about', experience: 'shelf', toolkit: 'bench', contact: 'office' };

const pointOf = (stop) => (stop > ROW ? stop + 1 : stop);
const stopOf = (point) => (point > ROW ? point - 1 : point);

export function createLab(canvas, { tier = 'desktop', stops = [] } = {}) {
  const phone = tier === 'phone';
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // Sharpest first. The governor (js/perf.js) steps down this ladder if frames
  // run slow: bloom goes first on a laptop, then the pixel count falls.
  const cap = Math.min(window.devicePixelRatio || 1, 2);
  const levels = [
    { ratio: cap, bloom: !phone },
    { ratio: Math.min(cap, 1.5), bloom: !phone },
    { ratio: Math.min(cap, 1.25), bloom: false },
    { ratio: 1, bloom: false },
    { ratio: 0.75, bloom: false },
  ];
  let quality = startingLevel(levels);
  renderer.setPixelRatio(levels[quality].ratio);

  // The page's darkest band colour, so the room fades into the page around it.
  const air = new THREE.Color().setHSL(205 / 360, 0.45, 0.026);
  const scene = new THREE.Scene();
  scene.background = air;
  scene.fog = new THREE.FogExp2(air, phone ? 0.055 : 0.045);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = environment;
  scene.environmentIntensity = 0.35;
  pmrem.dispose();

  const materials = createMaterials(THREE, tier);
  const room = createRoom(THREE, materials, { tier });
  scene.add(room.group);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 90);

  // Bloom on the light strips and holograms, on desktop only. MSAA on its
  // target only below a retina pixel ratio: at 2x, 4 samples doubled the frame
  // time (p95 33 ms against 16.7 ms) for edges the eye can't tell apart.
  let composer = null;
  let lensPass = null;
  if (!phone) {
    const samples = levels[quality].ratio < 1.5 ? 4 : 0;
    const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples });
    composer = new EffectComposer(renderer, target);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.35, 0.4, 0.9));
    composer.addPass(new OutputPass());
    // After tone mapping, so the grain sits on the picture as film does.
    lensPass = new ShaderPass(lens);
    composer.addPass(lensPass);
  }

  // The path: one point per stop, two for the suits. Catmull-Rom through all
  // seven, except along the row of bays, where the camera dollies straight,
  // and the last stretch, bench to office, which bends in through the doorway
  // (a straight line would cut through the partition beside it).
  const eyes = VIEWS.map((v) => new THREE.Vector3(...v.eye));
  const looks = VIEWS.map((v) => new THREE.Vector3(...v.look));
  const eyeCurve = new THREE.CatmullRomCurve3(eyes, false, 'centripetal');
  const lookCurve = new THREE.CatmullRomCurve3(looks, false, 'centripetal');
  const last = eyes.length - 1;
  const bend = (points) => new THREE.QuadraticBezierCurve3(points[last - 1], new THREE.Vector3(...(points === eyes ? DOORWAY_BEND.eye : DOORWAY_BEND.look)), points[last]);
  const bends = new Map([[eyes, bend(eyes)], [looks, bend(looks)]]);
  const along = (curve, points, u, out) => {
    const v = Math.min(Math.max(u, 0), last);
    if (v >= ROW && v <= ROW + 1) return out.lerpVectors(points[ROW], points[ROW + 1], v - ROW);
    if (v >= last - 1) return bends.get(points).getPoint(v - (last - 1), out);
    return out.copy(curve.getPoint(v / last));
  };

  // Each stop's group, placed at its mark and turned so its +z faces the eye.
  const groups = new Map();
  const groupFor = (id) => {
    if (groups.has(id)) return groups.get(id);
    const group = new THREE.Group();
    group.name = `stop:${id}`;
    const k = stops.findIndex((s) => s.id === id);
    const mark = room.marks[MARK[id]];
    if (mark && k >= 0) {
      const eye = eyes[pointOf(k)];
      group.position.copy(mark);
      group.lookAt(eye.x, mark.y, eye.z);
    }
    groups.set(id, group);
    scene.add(group);
    return group;
  };

  // The window each stop is framed in, measured in CSS pixels of the viewport.
  let width = 1;
  let height = 1;
  let frames = [];
  const whole = () => ({ cx: width / 2, cy: height / 2, w: width, h: height });
  // Each is measured where it sits on screen when the camera arrives at its
  // stop: the top of the page for the door, and for the rest the moment their
  // section reaches the top of the screen (or the page ends, for the last).
  const measure = () => {
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    frames = stops.map((s, k) => {
      const box = s.frame?.getBoundingClientRect();
      if (!box || box.width < 1 || box.height < 1) return whole();
      const arrival = k === 0 || !s.section ? 0 : Math.min(s.section.getBoundingClientRect().top + window.scrollY, maxScroll);
      const top = box.top + window.scrollY - arrival;
      return { cx: box.left + box.width / 2, cy: top + box.height / 2, w: box.width, h: box.height };
    });
  };
  const frameAt = (u) => {
    if (!frames.length) return whole();
    const v = Math.min(Math.max(u, 0), last);
    const i = Math.min(Math.floor(v), last - 1);
    const t = v - i;
    const a = frames[stopOf(i)] ?? frames[0];
    const b = frames[stopOf(i + 1)] ?? a;
    const mix = (x, y) => x + (y - x) * t;
    return { cx: mix(a.cx, b.cx), cy: mix(a.cy, b.cy), w: mix(a.w, b.w), h: mix(a.h, b.h) };
  };

  // The camera follows the rail with a little lag, and leans toward whatever
  // the visitor is looking at.
  let u = 0;
  let target = 0;
  // Leaning is a dolly: eye and gaze both move LEAN of the way toward the
  // object, eased in and out (the last point is kept so it eases back from it).
  let leanTo = null;
  let leaning = 0;
  const leanPoint = new THREE.Vector3();
  const eye = new THREE.Vector3();
  const look = new THREE.Vector3();
  const place = () => {
    along(eyeCurve, eyes, u, eye);
    along(lookCurve, looks, u, look);
    if (leaning > 1e-4) {
      eye.lerp(leanPoint, LEAN * leaning);
      look.lerp(leanPoint, LEAN * leaning);
    }
    camera.position.copy(eye);
    camera.lookAt(look);
    room.follow(eye);
    const f = frameAt(u);
    // The cap is wide enough for a tall tablet's narrow window (a third of a
    // 1024 × 1366 screen); the view offset keeps the window on the lens's
    // axis, so only the canvas outside it, under the panel, is stretched.
    const tan = Math.min(Math.max((HALF_FOV * height) / Math.max(1, Math.min(f.w, f.h)), 0.18), 2);
    camera.fov = (2 * Math.atan(tan) * 180) / Math.PI;
    camera.aspect = width / height;
    camera.setViewOffset(width, height, width / 2 - f.cx, height / 2 - f.cy, width, height);
    camera.updateProjectionMatrix();
    // Only the stops near the camera are drawn.
    groups.forEach((group, id) => {
      const k = stops.findIndex((s) => s.id === id);
      if (k < 0) return;
      const from = pointOf(k);
      const to = k === ROW ? from + 1 : from;
      const distance = u < from ? from - u : u > to ? u - to : 0;
      // The suits are seen from further: they stand in the first shot, down
      // the gallery, as soon as the door opens.
      group.visible = distance < (k === ROW ? 2.5 : 1.5);
    });
  };

  const draw = () => {
    place();
    if (lensPass) lensPass.uniforms.time.value = (performance.now() / 1000) % 100;
    if (composer && levels[quality].bloom) composer.render();
    else renderer.render(scene, camera);
  };

  // The size the canvas is drawn at follows the quality level.
  const fitCanvas = () => {
    renderer.setPixelRatio(levels[quality].ratio);
    renderer.setSize(width, height, false);
    if (composer) {
      composer.setPixelRatio(levels[quality].ratio);
      composer.setSize(width, height);
    }
  };
  const governor = createGovernor(levels, {
    level: quality,
    floor: 3,
    onLevel: (_, next) => {
      quality = next;
      fitCanvas();
    },
  });

  const listeners = [];
  let running = false;
  let raf = 0;
  let then = 0;
  // Once the page has been still for a moment the room only breathes (lights,
  // holograms), so it is drawn at half rate: the same look for half the work.
  let moved = 0;
  let drawn = 0;
  const tick = (now) => {
    raf = requestAnimationFrame(tick);
    const calm = now - moved > 700 && u === target && !leanTo && leaning < 1e-3;
    if (calm && now - drawn < 30) return;
    if (!calm) governor.note(now - drawn);
    drawn = now;
    const dt = Math.min(0.1, Math.max(0, (now - then) / 1000));
    then = now;
    u = Math.abs(target - u) < 1e-4 ? target : damp(u, target, 6, dt);
    if (leanTo) leanTo.getWorldPosition(leanPoint);
    leaning = damp(leaning, leanTo ? 1 : 0, 4, dt);
    room.update(now);
    listeners.forEach((fn) => fn(dt));
    draw();
  };

  const resize = (w, h) => {
    width = Math.max(1, Math.round(w));
    height = Math.max(1, Math.round(h));
    fitCanvas();
    moved = performance.now();
    measure();
    if (!running) draw();
  };

  return {
    THREE,
    scene,
    camera,
    renderer,
    room,
    materials,
    add(stopId, object) {
      groupFor(stopId).add(object);
      return object;
    },
    // Back to full rate for a moment: something is about to move on its own.
    wake() {
      moved = performance.now();
    },
    setRail({ u: next }, { instant = false } = {}) {
      const to = Math.min(Math.max(next, 0), last);
      if (to !== target) moved = performance.now();
      target = to;
      if (instant) u = target;
      if (!running) draw();
    },
    project(object) {
      const p = object.getWorldPosition(new THREE.Vector3()).project(camera);
      const x = ((p.x + 1) / 2) * width;
      const y = ((1 - p.y) / 2) * height;
      return { x, y, onScreen: p.z < 1 && x >= 0 && x <= width && y >= 0 && y <= height };
    },
    lean(object) {
      leanTo = object ?? null;
      if (leanTo) leanTo.getWorldPosition(leanPoint);
      if (!running) {
        leaning = leanTo ? 1 : 0;
        draw();
      }
    },
    onFrame(fn) {
      listeners.push(fn);
      return () => {
        const i = listeners.indexOf(fn);
        if (i >= 0) listeners.splice(i, 1);
      };
    },
    measure,
    draw,
    start() {
      if (running) return;
      running = true;
      then = performance.now();
      drawn = then;
      moved = then;
      raf = requestAnimationFrame(tick);
    },
    stop() {
      running = false;
      cancelAnimationFrame(raf);
    },
    resize,
    dispose() {
      running = false;
      cancelAnimationFrame(raf);
      groups.forEach((g) => scene.remove(g));
      room.dispose();
      materials.dispose();
      environment.dispose();
      composer?.dispose();
      renderer.dispose();
    },
  };
}
