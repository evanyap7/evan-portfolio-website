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

const VIEW = 3.2; // world units across the canvas; a suit is about 2.3 tall
const SCAN_SECONDS = 0.85;
const SCAN_RANGE = 1.35;
const EDGE_ANGLE = 15;
const LIFT = 0.15; // centres the figure on the stage

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

// The parts of one suit, as plain data: geometry (already placed) and role.
// spec: { bulk, facets, helm, emblem: { sides, turn }, extras: [] }.
// helm is one of slit, dome, visor, hex, crest; extras may hold pack, spines.
function buildParts(spec) {
  const { bulk = 1, facets = 16, helm = 'dome', emblem = { sides: 32 }, extras = [] } = spec;
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
  // Part of a sphere facing +z: `width` radians around, polar band t0 to t1.
  const shell = (r, width, t0, t1) => new THREE.SphereGeometry(r, 16, 8, Math.PI / 2 - width / 2, width, t0, t1 - t0);
  const tube = (top, bottom, height) => new THREE.CylinderGeometry(top, bottom, height, facets);
  const ring = (r, tube_) => new THREE.TorusGeometry(r, tube_, 8, facets * 2);
  const slab = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const head = [1, 1.12, 1.06];

  // Helmet, centred at y 0.82.
  if (helm === 'slit') {
    add(slab(0.27, 0.33, 0.3), 'plate', [0, 0.82, 0]);
    add(slab(0.29, 0.05, 0.31), 'trim', [0, 0.9, 0.006]);
    add(slab(0.2, 0.028, 0.02), 'glow', [0, 0.83, 0.153]);
    add(slab(0.03, 0.12, 0.02), 'trim', [0, 0.73, 0.153]);
  } else if (helm === 'hex') {
    add(ball(0.16, 6, 4), 'plate', [0, 0.82, 0], { scale: head, rot: [0, Math.PI / 6, 0] });
    add(slab(0.18, 0.03, 0.04), 'glow', [0, 0.84, 0.14]);
    add(slab(0.2, 0.06, 0.06), 'trim', [0, 0.72, 0.1]);
  } else {
    add(ball(0.155), 'plate', [0, 0.82, 0], { scale: head });
    if (helm === 'visor') {
      add(shell(0.16, 2.1, 1.05, 1.9), 'core', [0, 0.82, 0], { scale: head });
      add(shell(0.162, 2.3, 0.95, 1.05), 'trim', [0, 0.82, 0], { scale: head });
    } else {
      add(shell(0.159, 1.9, 1.3, 1.5), 'glow', [0, 0.82, 0], { scale: head });
      add(shell(0.161, 1.6, 1.75, 2.45), 'trim', [0, 0.82, 0], { scale: head });
    }
    if (helm === 'crest') {
      const fin = new THREE.Shape();
      fin.moveTo(-0.12, 0);
      fin.quadraticCurveTo(-0.02, 0.05, 0.14, 0.12);
      fin.quadraticCurveTo(0.06, 0.02, 0.1, 0);
      fin.closePath();
      [0, 1, 2].forEach((i) => {
        const g = new THREE.ExtrudeGeometry(fin, { depth: 0.014, bevelEnabled: false });
        g.translate(0, 0, -0.007);
        add(g, 'trim', [0, 0.95 - i * 0.07, -0.05 - i * 0.05], { rot: [0, -Math.PI / 2, -0.35 - i * 0.25], scale: [1 - i * 0.18, 1 - i * 0.18, 1] });
      });
    }
  }
  add(tube(0.065, 0.075, 0.1), 'dark', [0, 0.65, 0]);
  add(ring(0.1, 0.018), 'trim', [0, 0.62, 0], { rot: [Math.PI / 2, 0, 0], scale: [1, 0.75, 1] });

  // Chest: a turned V profile, flattened front to back.
  const profile = [[0.001, -0.17], [0.2, -0.16], [0.22, -0.06], [0.29, 0.1], [0.33, 0.19], [0.31, 0.25], [0.16, 0.29], [0.001, 0.29]]
    .map(([r, y]) => new THREE.Vector2(r === 0.001 ? r : r * bulk, y));
  add(new THREE.LatheGeometry(profile, facets), 'plate', [0, 0.36, 0], { scale: [1, 1, 0.66] });

  // The emblem: a raised frame, the light in the suit's own shape, a hot core.
  const { sides = 32, turn = 0 } = emblem;
  const frame = new THREE.ExtrudeGeometry(ngon(0.085, sides, turn), { depth: 0.02, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 1 });
  add(frame, 'chrome', [0, 0.42, 0.17]);
  add(new THREE.ShapeGeometry(ngon(0.065, sides, turn)), 'core', [0, 0.42, 0.198]);
  add(new THREE.ShapeGeometry(ngon(0.03, sides, turn)), 'hot', [0, 0.42, 0.2]);

  // Abdomen in bands, belt, hips.
  [0.13, 0.05, -0.03].forEach((y, i) => add(tube(0.2 - i * 0.008, 0.19 - i * 0.008, 0.07), i % 2 ? 'dark' : 'plate', [0, y, 0], { scale: [1, 1, 0.7] }));
  add(tube(0.215, 0.215, 0.06), 'trim', [0, -0.1, 0], { scale: [1, 1, 0.75] });
  add(slab(0.38 * bulk, 0.14, 0.25), 'plate', [0, -0.2, 0]);

  if (extras.includes('pack')) {
    add(slab(0.36 * bulk, 0.34, 0.14), 'dark', [0, 0.42, -0.24]);
    [-1, 1].forEach((side) => {
      add(tube(0.045, 0.06, 0.12), 'chrome', [side * 0.11, 0.2, -0.26]);
      add(new THREE.CircleGeometry(0.04, 16), 'core', [side * 0.11, 0.139, -0.26], { rot: [Math.PI / 2, 0, 0] });
    });
  }

  // Arms and legs, built once per side.
  [-1, 1].forEach((side) => {
    const ax = (x) => side * x * bulk;
    add(ball(0.1), 'dark', [ax(0.4), 0.56, 0]);
    add(new THREE.SphereGeometry(0.14 * bulk, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.6), 'plate', [ax(0.41), 0.57, 0], { scale: [1, 0.85, 0.95], rot: [0, 0, side * -0.3] });
    if (extras.includes('spines')) {
      add(slab(0.02, 0.1, 0.05), 'trim', [ax(0.45), 0.72, 0], { rot: [0, 0, side * -0.4] });
    }
    add(tube(0.085 * bulk, 0.075 * bulk, 0.3), 'plate', [ax(0.47), 0.36, 0], { rot: [0, 0, side * 0.1] });
    add(ball(0.075), 'dark', [ax(0.5), 0.2, 0]);
    add(tube(0.095 * bulk, 0.07 * bulk, 0.32), 'trim', [ax(0.53), 0.02, 0], { rot: [0, 0, side * 0.06] });
    add(ring(0.076 * bulk, 0.012), 'chrome', [ax(0.54), -0.13, 0], { rot: [Math.PI / 2, 0, 0] });
    add(ball(0.075), 'plate', [ax(0.55), -0.22, 0]);
    add(new THREE.CircleGeometry(0.034, 20), 'glow', [ax(0.55), -0.22, 0.076]);

    add(tube(0.13, 0.095, 0.4), 'plate', [side * 0.14, -0.5, 0]);
    add(ball(0.09), 'dark', [side * 0.14, -0.74, 0.01]);
    add(shell(0.1, 1.8, 0.4, 1.9), 'trim', [side * 0.14, -0.74, 0.02]);
    add(tube(0.1, 0.07, 0.38), 'plate', [side * 0.14, -0.95, 0]);
    add(ball(0.06), 'dark', [side * 0.14, -1.15, 0]);
    add(slab(0.17, 0.1, 0.3), 'trim', [side * 0.14, -1.23, 0.06]);
  });

  // A ring of light on the floor under the boots.
  add(new THREE.RingGeometry(0.55, 0.57, 72), 'glow', [0, -1.29, 0], { rot: [-Math.PI / 2, 0, 0] });

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

  const glowColor = new THREE.Color().setHSL(190 / 360, 0.95, 0.6);
  const glowPale = new THREE.Color().copy(glowColor).lerp(new THREE.Color(1, 1, 1), 0.7);
  let look = { plate: 0x9aa0a6, trim: 0x6b7076, rough: 0.4 };

  function materialsFor(kind) {
    if (kind === 'lit') {
      const metal = (color, roughness) => new THREE.MeshPhysicalMaterial({ color, metalness: 0.9, roughness, clearcoat: 0.5, clearcoatRoughness: 0.25, side: THREE.DoubleSide });
      return {
        plate: metal(look.plate, look.rough),
        trim: metal(look.trim, look.rough * 0.8),
        chrome: new THREE.MeshPhysicalMaterial({ color: 0xdfe3e8, metalness: 1, roughness: 0.12, side: THREE.DoubleSide }),
        dark: new THREE.MeshStandardMaterial({ color: 0x2d3238, metalness: 0.85, roughness: 0.42 }),
        glow: new THREE.MeshBasicMaterial({ color: tinted(1.7, glowColor), side: THREE.DoubleSide }),
        core: new THREE.MeshBasicMaterial({ color: tinted(0.75, glowColor), side: THREE.DoubleSide }),
        hot: new THREE.MeshBasicMaterial({ color: tinted(2.2, glowPale), side: THREE.DoubleSide }),
      };
    }
    if (kind === 'shaded') {
      const clay = () => new THREE.MeshStandardMaterial({ color: 0x9aa3ad, metalness: 0.05, roughness: 0.62, side: THREE.DoubleSide });
      const light = (m) => new THREE.MeshBasicMaterial({ color: tinted(m, glowColor), toneMapped: false, side: THREE.DoubleSide });
      return {
        plate: clay(),
        trim: clay(),
        chrome: clay(),
        dark: new THREE.MeshStandardMaterial({ color: 0x4a525a, roughness: 0.7 }),
        glow: light(1),
        core: light(0.8),
        hot: light(1.4),
      };
    }
    const line = (mult, base = hue) => new THREE.MeshBasicMaterial({ color: tinted(mult, base), wireframe: true, toneMapped: false, side: THREE.DoubleSide });
    return {
      plate: line(0.55), trim: line(0.8), chrome: line(0.7), dark: line(0.25),
      glow: line(1), core: line(0.8), hot: line(1, pale),
    };
  }

  function blueprintMaterials() {
    const line = (mult, base = hue) => new THREE.LineBasicMaterial({ color: tinted(mult, base), toneMapped: false });
    return {
      plate: line(0.85), trim: line(0.95), chrome: line(0.9), dark: line(0.3),
      glow: line(1), core: line(0.9), hot: line(1, pale),
    };
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
    look = spec.look;
    glowColor.setHSL(spec.hue / 360, 0.95, 0.6);
    glowPale.copy(glowColor).lerp(new THREE.Color(1, 1, 1), 0.7);
    hue.setHSL(spec.hue / 360, 0.95, 0.56);
    pale.copy(hue).lerp(new THREE.Color(1, 1, 1), 0.7);
    scanMaterial.color.copy(pale).multiplyScalar(1.4);
    coreLight.color.copy(glowColor);
    coreLight.position.set(0, 0.53, 0.45);

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
      return { root: repRoot, materials: Object.values(set) };
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
