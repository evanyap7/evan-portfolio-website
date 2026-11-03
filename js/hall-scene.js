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

// The parts of one suit, as plain data: geometry (already placed) and role.
// spec: { bulk, facets, mask }. Without a mask the helmet is a plain box
// with a visor slit, like the first suit.
function buildParts(spec) {
  const { bulk = 1, facets = 16, mask = true } = spec;
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
  const ball = (r) => new THREE.SphereGeometry(r, 16, 10);
  const tube = (top, bottom, height) => new THREE.CylinderGeometry(top, bottom, height, facets);

  // Head.
  if (mask) {
    add(ball(0.15), 'plate', [0, 0.8, 0], { scale: [0.95, 1.18, 1.05] });
    add(new THREE.SphereGeometry(0.157, 16, 10, Math.PI / 2 - 0.85, 1.7, 0.55, 2.0), 'trim', [0, 0.8, 0.004], { scale: [0.95, 1.18, 1.05] });
    [-1, 1].forEach((side) => add(new THREE.BoxGeometry(0.07, 0.02, 0.012), 'glow', [side * 0.058, 0.82, 0.165], { rot: [0, 0, side * 0.2] }));
  } else {
    add(new THREE.BoxGeometry(0.27, 0.34, 0.3), 'plate', [0, 0.8, 0]);
    add(new THREE.BoxGeometry(0.2, 0.03, 0.02), 'glow', [0, 0.83, 0.155]);
  }
  add(tube(0.07, 0.08, 0.1), 'dark', [0, 0.62, 0]);

  // Chest, with the reactor in it, then waist and belt.
  add(tube(0.33 * bulk, 0.21, 0.52), 'plate', [0, 0.36, 0], { scale: [1, 1, 0.7] });
  add(new THREE.TorusGeometry(0.068, 0.014, 10, 32), 'chrome', [0, 0.38, 0.19]);
  add(new THREE.RingGeometry(0.044, 0.056, 32), 'glow', [0, 0.38, 0.194]);
  add(new THREE.CircleGeometry(0.044, 32), 'core', [0, 0.38, 0.195]);
  add(new THREE.CircleGeometry(0.016, 20), 'hot', [0, 0.38, 0.198]);
  add(tube(0.2, 0.18, 0.22), 'dark', [0, -0.05, 0], { scale: [1, 1, 0.7] });
  add(tube(0.22, 0.22, 0.06), 'trim', [0, -0.17, 0], { scale: [1, 1, 0.75] });
  add(new THREE.BoxGeometry(0.4 * bulk, 0.15, 0.24), 'plate', [0, -0.27, 0]);

  // Arms and legs, built once per side.
  [-1, 1].forEach((side) => {
    add(ball(0.17 * bulk), 'plate', [side * 0.41 * bulk, 0.55, 0], { scale: [1, 0.9, 1] });
    add(tube(0.095 * bulk, 0.08 * bulk, 0.34), 'plate', [side * 0.47 * bulk, 0.34, 0], { rot: [0, 0, side * 0.1] });
    add(ball(0.08), 'dark', [side * 0.51 * bulk, 0.16, 0]);
    add(tube(0.095 * bulk, 0.065 * bulk, 0.34), 'trim', [side * 0.53 * bulk, -0.03, 0], { rot: [0, 0, side * 0.06] });
    add(ball(0.08), 'trim', [side * 0.55 * bulk, -0.25, 0]);
    add(new THREE.CircleGeometry(0.035, 20), 'glow', [side * 0.55 * bulk, -0.25, 0.078]);

    add(tube(0.13, 0.095, 0.42), 'plate', [side * 0.14, -0.55, 0]);
    add(ball(0.1), 'dark', [side * 0.14, -0.78, 0.02]);
    add(tube(0.1, 0.07, 0.4), 'plate', [side * 0.14, -1.0, 0]);
    add(new THREE.BoxGeometry(0.17, 0.11, 0.3), 'trim', [side * 0.14, -1.24, 0.06]);
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
        core: new THREE.MeshBasicMaterial({ color: tinted(1.1, glowColor), side: THREE.DoubleSide }),
        hot: new THREE.MeshBasicMaterial({ color: tinted(3.4, glowPale), side: THREE.DoubleSide }),
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
