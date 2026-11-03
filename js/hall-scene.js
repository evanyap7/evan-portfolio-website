// The Hall of Armor's 3D stage, page side in hall.js. One shared canvas shows
// one suit at a time: a full figure of armour built from plain primitives
// (helmet, chest with its reactor, shoulders, limbs, boots), so each Mark can
// differ in colourway, bulk and how faceted it is. Each suit is built four
// times from the same geometry, once per render pass: blueprint (edges only),
// wireframe, shaded clay, and fully lit. Changing pass sweeps a scan line up
// the suit: below the line is the new pass, above it the old one.

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const VIEW = 2.85; // world units across the canvas; a suit is about 2.1 tall
const SCAN_SECONDS = 0.85;
const SCAN_RANGE = 1.2;
const EDGE_ANGLE = 15;
const LIFT = 0.08; // centres the figure on the stage
const JARVIS = 196; // the hue of every reactor, eye and blueprint line

// A regular polygon with circumradius r, first vertex at the top (plus turn).
function ngon(r, sides, turn = 0) {
  const shape = new THREE.Shape();
  if (sides >= 32) {
    shape.absarc(0, 0, r, 0, Math.PI * 2, false);
    return shape;
  }
  for (let i = 0; i < sides; i += 1) {
    const a = Math.PI / 2 + turn + (i / sides) * Math.PI * 2;
    if (i === 0) shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  shape.closePath();
  return shape;
}

// Painted panels: each suit's paint says which of these take the accent
// colour (gold on the hot rods, red on Mark V) and which the base.
const PANELS = ['limb', 'helmet', 'face', 'chest', 'abs', 'belt', 'hips', 'shoulder', 'upperArm', 'forearm', 'hand', 'thigh', 'knee', 'shin', 'boot'];
// Lit parts that are the same on every suit.
const FIXED = ['dark', 'chrome', 'glow', 'core', 'hot', 'floor'];

// The parts of one suit, as plain data: geometry (already placed) and role,
// a panel name or a fixed role. spec: { bulk, facets, helm, reactor }, where
// helm is 'classic' (faceplate, slit eyes, ear discs) or 'mk1' (the riveted
// bucket of the cave suit) and reactor is 'round' or 'tri'.
function buildParts(spec) {
  const { bulk = 1, facets = 20, helm = 'classic', reactor = 'round' } = spec;
  const parts = [];
  const matrix = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const add = (geometry, role, [x, y, z], { rot = [0, 0, 0], scale = [1, 1, 1] } = {}) => {
    euler.set(rot[0], rot[1], rot[2]);
    quat.setFromEuler(euler);
    matrix.compose(new THREE.Vector3(x, y + LIFT, z), quat, new THREE.Vector3(scale[0], scale[1], scale[2]));
    parts.push({ geometry: geometry.applyMatrix4(matrix), role });
  };
  const ball = (r, w = 16, h = 10) => new THREE.SphereGeometry(r, w, h);
  // Part of a unit sphere facing +z: `width` radians around, polar band t0 to t1.
  const cap = (width, t0, t1, r = 1) => new THREE.SphereGeometry(r, 24, 14, Math.PI / 2 - width / 2, width, t0, t1 - t0);
  const tube = (top, bottom, height, sides = facets) => new THREE.CylinderGeometry(top, bottom, height, sides);
  const slab = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const b = bulk;

  // Helmet, centred at y 0.85.
  const head = [0.112 * b ** 0.3, 0.14, 0.128];
  if (helm === 'mk1') {
    // A riveted iron bucket: flat front, eye holes and a mouth grille.
    add(tube(0.125, 0.12, 0.29, 8), 'helmet', [0, 0.85, 0], { rot: [0, Math.PI / 8, 0] });
    add(slab(0.165, 0.23, 0.02), 'face', [0, 0.84, 0.115]);
    [-1, 1].forEach((side) => {
      add(slab(0.045, 0.022, 0.01), 'glow', [side * 0.04, 0.89, 0.126]);
      add(ball(0.009, 6, 4), 'chrome', [side * 0.07, 0.94, 0.125]);
      add(ball(0.009, 6, 4), 'chrome', [side * 0.07, 0.74, 0.125]);
    });
    [0, 1, 2].forEach((i) => add(slab(0.07, 0.008, 0.01), 'dark', [0, 0.8 - i * 0.02, 0.126]));
  } else {
    add(ball(1, 28, 18), 'helmet', [0, 0.85, 0], { scale: head });
    // The faceplate: brow to chin, cheek to cheek, a little proud of the skull.
    add(cap(1.9, 0.62, 2.5, 1.035), 'face', [0, 0.85, 0], { scale: head });
    [-1, 1].forEach((side) => {
      // Eye slits that frown: the inner ends sit lower.
      add(slab(0.05, 0.015, 0.01), 'glow', [side * 0.041, 0.866, 0.124], { rot: [0, side * 0.36, side * 0.16] });
      add(tube(0.034, 0.034, 0.018, 20), 'helmet', [side * 0.112, 0.84, -0.01], { rot: [0, 0, Math.PI / 2] });
    });
    add(slab(0.05, 0.005, 0.01), 'dark', [0, 0.772, 0.112]);
  }
  add(tube(0.05, 0.06, 0.1), 'dark', [0, 0.69, 0]);

  // Chest: a turned V, broad at the pecs and narrow at the waist, flattened
  // front to back, with two pectoral plates and the reactor housing between.
  const profile = [[0.001, -0.12], [0.155, -0.12], [0.175, -0.04], [0.225, 0.1], [0.25, 0.2], [0.235, 0.26], [0.12, 0.31], [0.001, 0.31]]
    .map(([r, y]) => new THREE.Vector2(r === 0.001 ? r : r * b, y));
  add(new THREE.LatheGeometry(profile, facets), 'chest', [0, 0.36, 0], { scale: [1, 1, 0.62] });
  [-1, 1].forEach((side) => {
    add(cap(2.4, 0.35, 2.3), 'chest', [side * 0.092 * b, 0.5, 0.055], { scale: [0.112 * b, 0.092, 0.08], rot: [0, side * 0.28, 0] });
  });
  add(tube(0.07, 0.074, 0.05, 32), 'chest', [0, 0.47, 0.125], { rot: [Math.PI / 2, 0, 0] });
  if (reactor === 'tri') {
    const tri = (r) => ngon(r, 3, Math.PI);
    add(new THREE.ExtrudeGeometry(tri(0.082), { depth: 0.012, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 1 }), 'chrome', [0, 0.47, 0.148]);
    add(new THREE.ShapeGeometry(tri(0.066)), 'core', [0, 0.47, 0.166]);
    add(new THREE.ShapeGeometry(tri(0.03)), 'hot', [0, 0.47, 0.168]);
  } else {
    add(new THREE.TorusGeometry(0.056, 0.01, 10, 40), 'chrome', [0, 0.47, 0.152]);
    add(new THREE.CircleGeometry(0.05, 40), 'core', [0, 0.47, 0.152]);
    add(new THREE.CircleGeometry(0.026, 32), 'hot', [0, 0.47, 0.155]);
  }

  // Abdomen: a dark core under six plates, then belt and hips.
  add(tube(0.135 * b, 0.125 * b, 0.26), 'dark', [0, 0.14, 0], { scale: [1, 1, 0.75] });
  [0.22, 0.16, 0.1].forEach((y, row) => [-1, 1].forEach((side) => {
    add(slab(0.058 - row * 0.004, 0.048, 0.03), 'abs', [side * 0.033, y, 0.088], { rot: [0, side * 0.22, 0] });
  }));
  add(tube(0.148 * b, 0.148 * b, 0.05), 'belt', [0, 0.0, 0], { scale: [1, 1, 0.76] });
  add(tube(0.152 * b, 0.12, 0.16), 'hips', [0, -0.1, 0], { scale: [1, 1, 0.78] });

  // A limb in the base colour with a raised front plate that takes the panel's
  // own colour, the way the films lay gold over red.
  const plated = (role, r0, r1, length, at, tilt, plate = 0.06) => {
    add(tube(r0, r1, length), 'limb', at, { rot: [0, 0, tilt] });
    const r = Math.max(r0, r1) * 1.04;
    add(cap(2.1, 0.3, 2.84), role, at, { scale: [r, length / 2, r], rot: [0, at[0] > 0 ? 0.45 : -0.45, tilt] });
    return plate;
  };

  // Arms and legs, built once per side.
  [-1, 1].forEach((side) => {
    const ax = (x) => side * x * b;
    add(ball(0.068 * b), 'dark', [ax(0.265), 0.56, 0]);
    add(new THREE.SphereGeometry(0.1 * b, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.56), 'shoulder', [ax(0.285), 0.59, 0], { scale: [1.05, 0.85, 1], rot: [0, 0, side * -0.4] });
    plated('upperArm', 0.058 * b, 0.052 * b, 0.26, [ax(0.305), 0.385, 0], side * 0.08);
    add(ball(0.05 * b), 'dark', [ax(0.322), 0.245, 0]);
    plated('forearm', 0.052 * b, 0.064 * b, 0.26, [ax(0.336), 0.105, 0], side * 0.04);
    add(tube(0.058 * b, 0.058 * b, 0.02), 'dark', [ax(0.342), -0.035, 0]);
    add(slab(0.05 * b, 0.085, 0.07 * b), 'hand', [ax(0.344), -0.09, 0.004]);
    add(slab(0.046 * b, 0.07, 0.064 * b), 'hand', [ax(0.344), -0.16, 0.014], { rot: [0.25, 0, 0] });
    add(slab(0.018, 0.05, 0.022), 'hand', [ax(0.344) - side * 0.028 * b, -0.085, 0.034], { rot: [0, 0, side * 0.3] });
    add(new THREE.CircleGeometry(0.019, 20), 'glow', [ax(0.344) - side * 0.026 * b, -0.095, 0.004], { rot: [0, -side * Math.PI / 2, 0] });

    const lx = side * 0.09 * b;
    plated('thigh', 0.095 * b, 0.072 * b, 0.42, [lx, -0.38, 0], 0);
    add(ball(0.06 * b), 'dark', [lx, -0.61, 0]);
    add(cap(2, 0.4, 1.9, 0.066 * b), 'knee', [lx, -0.61, 0.022]);
    plated('shin', 0.072 * b, 0.058 * b, 0.38, [lx, -0.83, 0], 0);
    add(ball(1, 16, 10), 'limb', [lx, -0.77, -0.028], { scale: [0.064 * b, 0.12, 0.056 * b] });
    add(tube(0.062 * b, 0.074 * b, 0.08), 'boot', [lx, -1.05, 0]);
    add(slab(0.098 * b, 0.065, 0.2), 'boot', [lx, -1.105, 0.04]);
  });

  // A ring of light on the floor under the boots.
  add(new THREE.RingGeometry(0.5, 0.515, 72), 'floor', [0, -1.14, 0.02], { rot: [-Math.PI / 2, 0, 0] });

  return { parts, outerR: 1 };
}

export function createHall(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.localClippingEnabled = true;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2));

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.3;
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
  camera.position.set(0, 0, VIEW / 2 / Math.tan(THREE.MathUtils.degToRad(14)));

  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  const warm = new THREE.DirectionalLight(0xffd2b0, 0.6);
  warm.position.set(3, -1.5, 3);
  const coreLight = new THREE.PointLight(0xffffff, 2, 3.2, 1.6);
  coreLight.position.set(0, 0, 0.5);
  scene.add(key, warm, coreLight);

  const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.45, 0.4, 0.95);
  Object.assign(bloom.blendMaterial, {
    blending: THREE.CustomBlending,
    blendSrc: THREE.SrcAlphaFactor,
    blendDst: THREE.OneFactor,
    blendSrcAlpha: THREE.ZeroFactor,
    blendDstAlpha: THREE.OneFactor,
  });
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // The scan line and the two planes that split old pass from new.
  const planeNew = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
  const planeOld = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const scanMaterial = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, toneMapped: false });
  const scanLine = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.012), scanMaterial);
  scanLine.position.z = 0.3;
  scanLine.visible = false;
  scene.add(scanLine);

  const hue = new THREE.Color();
  const pale = new THREE.Color();
  const state = { tx: 0, ty: 0 };
  let suit = null; // { root, reps: [{ root, materials }], outerR, geometries }
  let pass = 3;
  let from = 3;
  let scan = 1; // 1 = settled; 0 to 1 = sweeping from `from` to `pass`
  let appear = 1;
  let time = 0;
  let last = 0;
  let frame = 0;

  const tinted = (mult, base = hue) => new THREE.Color().copy(base).multiplyScalar(mult);

  const glowColor = new THREE.Color().setHSL(JARVIS / 360, 0.9, 0.62);
  const glowPale = new THREE.Color().copy(glowColor).lerp(new THREE.Color(1, 1, 1), 0.75);
  hue.setHSL(JARVIS / 360, 0.95, 0.56);
  pale.copy(hue).lerp(new THREE.Color(1, 1, 1), 0.7);
  scanMaterial.color.copy(pale).multiplyScalar(1.4);
  coreLight.color.copy(glowColor);
  let paint = { base: 0x9aa0a6, accent: 0x6b7076, rough: 0.4, accentOn: [] };

  // Every role mapped to a material: panels share one per paint colour.
  const roleMap = (panel, fixed) => {
    const set = { ...fixed };
    PANELS.forEach((name) => { set[name] = panel(name); });
    return set;
  };

  function materialsFor(kind) {
    const accented = (name) => paint.accentOn.includes(name);
    if (kind === 'lit') {
      // Lacquered paint: a metal flake under a clear coat, like the films' hot rods.
      const lacquer = (color, roughness) => new THREE.MeshPhysicalMaterial({ color, metalness: 0.75, roughness, clearcoat: 1, clearcoatRoughness: 0.12, side: THREE.DoubleSide });
      const base = lacquer(paint.base, paint.rough);
      const accent = lacquer(paint.accent, paint.rough * 0.85);
      const face = paint.face === undefined ? null : lacquer(paint.face, paint.rough * 0.85);
      return roleMap((name) => (name === 'face' && face) || (accented(name) ? accent : base), {
        chrome: new THREE.MeshPhysicalMaterial({ color: 0xdfe3e8, metalness: 1, roughness: 0.12, side: THREE.DoubleSide }),
        dark: new THREE.MeshStandardMaterial({ color: 0x24282d, metalness: 0.8, roughness: 0.45 }),
        glow: new THREE.MeshBasicMaterial({ color: tinted(1.6, glowPale), side: THREE.DoubleSide }),
        core: new THREE.MeshBasicMaterial({ color: tinted(0.9, glowColor), side: THREE.DoubleSide }),
        hot: new THREE.MeshBasicMaterial({ color: tinted(2.2, glowPale), side: THREE.DoubleSide }),
        floor: new THREE.MeshBasicMaterial({ color: tinted(1.2, glowColor), side: THREE.DoubleSide }),
      });
    }
    if (kind === 'shaded') {
      const clay = new THREE.MeshStandardMaterial({ color: 0x9aa3ad, metalness: 0.05, roughness: 0.62, side: THREE.DoubleSide });
      const light = (m) => new THREE.MeshBasicMaterial({ color: tinted(m, glowColor), toneMapped: false, side: THREE.DoubleSide });
      return roleMap(() => clay, {
        chrome: clay,
        dark: new THREE.MeshStandardMaterial({ color: 0x4a525a, roughness: 0.7 }),
        glow: light(1), core: light(0.8), hot: light(1.4), floor: light(1),
      });
    }
    const line = (mult, base = hue) => new THREE.MeshBasicMaterial({ color: tinted(mult, base), wireframe: true, toneMapped: false, side: THREE.DoubleSide });
    const plain = line(0.5);
    const lifted = line(0.8);
    return roleMap((name) => (accented(name) || name === 'face' ? lifted : plain), {
      chrome: line(0.7), dark: line(0.22), glow: line(1), core: line(0.8), hot: line(1, pale), floor: line(1),
    });
  }

  function blueprintMaterials() {
    const line = (mult, base = hue) => new THREE.LineBasicMaterial({ color: tinted(mult, base), toneMapped: false });
    const plain = line(0.8);
    const lifted = line(1);
    return roleMap((name) => (paint.accentOn.includes(name) || name === 'face' ? lifted : plain), {
      chrome: line(0.9), dark: line(0.3), glow: line(1), core: line(0.9), hot: line(1, pale), floor: line(1),
    });
  }

  function dispose() {
    if (!suit) return;
    scene.remove(suit.root);
    suit.reps.forEach((rep) => rep.materials.forEach((material) => {
      material.roughnessMap?.dispose();
      material.dispose();
    }));
    suit.geometries.forEach((geometry) => geometry.dispose());
    suit = null;
  }

  function build(spec) {
    dispose();
    paint = { accentOn: [], ...spec.paint };
    coreLight.position.set(0, 0.56, 0.45);

    const { parts, outerR } = buildParts(spec);
    const root = new THREE.Group();
    const edges = new Map();
    const reps = ['blueprint', 'wire', 'shaded', 'lit'].map((kind) => {
      const set = kind === 'blueprint' ? blueprintMaterials() : materialsFor(kind);
      const repRoot = new THREE.Group();
      parts.forEach((part) => {
        let object;
        if (kind === 'blueprint') {
          if (!edges.has(part.geometry)) edges.set(part.geometry, new THREE.EdgesGeometry(part.geometry, EDGE_ANGLE));
          object = new THREE.LineSegments(edges.get(part.geometry), set[part.role]);
        } else {
          object = new THREE.Mesh(part.geometry, set[part.role]);
        }
        repRoot.add(object);
      });
      root.add(repRoot);
      return { root: repRoot, materials: [...new Set(Object.values(set))] };
    });
    scene.add(root);
    suit = { root, reps, outerR, geometries: [...new Set(parts.map((p) => p.geometry)), ...edges.values()] };
    appear = 0;
    applyVisibility();
  }

  // Which representations draw, and which side of the scan line each keeps.
  function applyVisibility() {
    if (!suit) return;
    const sweeping = scan < 1;
    suit.reps.forEach((rep, index) => {
      const isNew = index === pass;
      const isOld = sweeping && index === from;
      rep.root.visible = isNew || isOld;
      const planes = sweeping ? [isNew ? planeNew : planeOld] : [];
      rep.materials.forEach((material) => {
        material.clippingPlanes = planes;
      });
    });
    scanLine.visible = sweeping;
  }

  function step(dt) {
    time += dt;
    if (!suit) return;
    appear = Math.min(1, appear + dt / 0.7);
    const ease = 1 - (1 - appear) ** 3;
    if (scan < 1) {
      scan = Math.min(1, scan + dt / SCAN_SECONDS);
      if (scan >= 1) applyVisibility();
      const y = -SCAN_RANGE + 2 * SCAN_RANGE * scan;
      planeNew.constant = y;
      planeOld.constant = -y;
      scanLine.position.y = y;
      scanMaterial.opacity = Math.sin(Math.PI * Math.min(1, scan));
    }
    const flick = appear < 1 ? (Math.sin(time * 70) > 0.1 - appear ? 1 : 0.3) : 1;
    const k = dt ? 1 - Math.exp(-dt * 6) : 1;
    suit.root.rotation.x += (0.02 + Math.cos(time * 1.15) * 0.02 - state.ty * 0.12 - suit.root.rotation.x) * k;
    suit.root.rotation.y += (0.2 + Math.sin(time * 0.9) * 0.3 + state.tx * 0.5 - suit.root.rotation.y) * k;
    suit.root.position.y = Math.sin(time * 1.3) * 0.016;
    suit.root.scale.setScalar((1 / suit.outerR) * (0.82 + 0.18 * ease));
    const lit = pass === 3 || (scan < 1 && from === 3);
    scene.environmentIntensity = 0.3 * flick;
    key.intensity = 1.1 * flick;
    warm.intensity = 0.6 * flick;
    coreLight.intensity = (lit ? 0.7 : 0.2) * flick * (1 + 0.04 * Math.sin(time * 19.7));
    bloom.strength = lit ? 0.5 : 0.18;
    key.position.set(-2.2 + state.tx * 3.2, 2.8 - state.ty * 2.4, 4);
  }

  function loop(now) {
    frame = requestAnimationFrame(loop);
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0);
    last = now;
    step(dt);
    composer.render();
  }

  // Redraws once when nothing is looping (reduced motion, or off screen).
  const still = () => {
    if (frame) return;
    step(0.016);
    composer.render();
  };

  return {
    state,
    setSuit(spec, { instant = false } = {}) {
      build(spec);
      scan = 1;
      if (instant) appear = 1;
      applyVisibility();
      still();
    },
    // `instant` skips the scan line (reduced motion).
    setPass(next, { instant = false } = {}) {
      if (next === pass && scan >= 1) return;
      from = pass;
      pass = next;
      scan = instant ? 1 : 0;
      applyVisibility();
      still();
    },
    resize(width, height) {
      renderer.setSize(width, height, false);
      composer.setPixelRatio(renderer.getPixelRatio());
      composer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      still();
    },
    start() {
      if (frame) return;
      last = 0;
      frame = requestAnimationFrame(loop);
    },
    stop() {
      cancelAnimationFrame(frame);
      frame = 0;
    },
  };
}
