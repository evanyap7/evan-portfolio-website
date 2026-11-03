// The Hall of Armor's 3D stage, page side in hall.js. One shared canvas shows
// one suit core at a time. A core is the arc reactor's cousin: the same parts
// (housing, wound coils, chrome ring, emitter) with a different housing shape,
// coil count and colour per Mark. Each core is built four times from the same
// geometry, once per render pass: blueprint (edges only), wireframe, shaded
// clay, and fully lit. Changing pass sweeps a scan line up the core: below
// the line is the new pass, above it the old one.

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const TAU = Math.PI * 2;
const VIEW = 3.2; // world units across the canvas; a core is normalised to 2 across
const SCAN_SECONDS = 0.85;
const EDGE_ANGLE = 24;

// A regular polygon (or a circle from 32 sides up) with its circumradius r.
function ngon(r, sides, asHole = false) {
  const path = asHole ? new THREE.Path() : new THREE.Shape();
  if (sides >= 32) {
    path.absarc(0, 0, r, 0, TAU, asHole);
    return path;
  }
  for (let i = 0; i < sides; i += 1) {
    const a = Math.PI / 2 + (i / sides) * TAU;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) path.moveTo(x, y);
    else path.lineTo(x, y);
  }
  path.closePath();
  return path;
}

// A slab shaped like a slice of a ring, centred on z = 0.
function sector(r0, r1, a0, a1, depth) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, r1, a0, a1, false);
  shape.absarc(0, 0, r0, a1, a0, true);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth, curveSegments: 20, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.005, bevelSegments: 1,
  });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

// The parts of one suit core, as plain data: geometry, material role, group.
function buildParts(spec) {
  const { sides, coils, h, bolts } = spec;
  const outerR = sides >= 32 ? h + 0.16 : (h + 0.16) / Math.cos(Math.PI / sides);
  const parts = [];
  const add = (geometry, role, group, x = 0, y = 0, z = 0, rz = 0) => {
    parts.push({ geometry, role, group, x, y, z, rz });
  };

  const outline = ngon(outerR, sides);
  outline.holes.push(ngon(h, 72, true));
  const housing = new THREE.ExtrudeGeometry(outline, {
    depth: 0.2, curveSegments: 36, bevelEnabled: true, bevelThickness: 0.022, bevelSize: 0.02, bevelSegments: 2,
  });
  housing.translate(0, 0, -0.1);
  add(housing, 'steel', 'body');
  add(new THREE.CircleGeometry(h, 72), 'dark', 'body', 0, 0, -0.09);
  add(new THREE.RingGeometry(h * 0.5, h * 0.98, 96), 'glow', 'body', 0, 0, -0.075);

  // Coils: a copper block and a run of windings, turning together.
  const span = (TAU / coils) * 0.72;
  const block = sector(h * 0.56, h * 0.96, -span / 2, span / 2, 0.16);
  const windings = 7;
  const winding = sector(h * 0.545, h * 0.975, -0.0065, 0.0065, 0.18);
  const plate = sector(h * 0.53, h * 0.985, -0.014, 0.014, 0.2);
  for (let c = 0; c < coils; c += 1) {
    const mid = (c / coils) * TAU + Math.PI / 2;
    add(block, 'copper', 'coils', 0, 0, 0, mid);
    for (let t = 0; t < windings; t += 1) {
      const a = mid - span / 2 + 0.04 + (t / (windings - 1)) * (span - 0.08);
      add(winding, 'wire', 'coils', 0, 0, 0, a);
    }
    [-1, 1].forEach((side) => add(plate, 'steel', 'coils', 0, 0, 0, mid + side * (span / 2 + 0.014)));
  }

  // The chrome ring and its bolts, turning against the coils.
  add(new THREE.TorusGeometry(h * 0.485, h * 0.05, 14, 72), 'chrome', 'inner');
  const bolt = new THREE.CylinderGeometry(h * 0.02, h * 0.023, 0.03, 6).rotateX(Math.PI / 2);
  for (let i = 0; i < bolts; i += 1) {
    const a = (i / bolts) * TAU + TAU / (bolts * 2);
    add(bolt, 'steel', 'inner', Math.cos(a) * h * 0.485, Math.sin(a) * h * 0.485, h * 0.05 + 0.004, a);
  }
  add(new THREE.CircleGeometry(h * 0.025, 12), 'hot', 'inner', 0, h * 0.485, h * 0.05 + 0.02);

  // The emitter: a ring of light, a lens in the core's own shape, a hot spot.
  add(new THREE.RingGeometry(h * 0.385, h * 0.44, 96), 'glow', 'body', 0, 0, 0.055);
  add(new THREE.ShapeGeometry(ngon(h * 0.37, sides), 24), 'core', 'body', 0, 0, 0.06);
  add(new THREE.CircleGeometry(h * 0.1, 48), 'hot', 'body', 0, 0, 0.066);

  return { parts, outerR };
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
  const scanLine = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.012), scanMaterial);
  scanLine.position.z = 0.3;
  scanLine.visible = false;
  scene.add(scanLine);

  const hue = new THREE.Color();
  const pale = new THREE.Color();
  const state = { tx: 0, ty: 0 };
  let suit = null; // { root, reps: [{ root, coils, inner, materials }], outerR, geometries }
  let pass = 3;
  let from = 3;
  let scan = 1; // 1 = settled; 0 to 1 = sweeping from `from` to `pass`
  let appear = 1;
  let time = 0;
  let last = 0;
  let frame = 0;

  const tinted = (mult, base = hue) => new THREE.Color().copy(base).multiplyScalar(mult);

  function groovedTexture() {
    const canvasEl = Object.assign(document.createElement('canvas'), { width: 4, height: 64 });
    const g = canvasEl.getContext('2d');
    for (let y = 0; y < 64; y += 1) {
      const v = 120 + Math.random() * 90;
      g.fillStyle = `rgb(${v},${v},${v})`;
      g.fillRect(0, y, 4, 1);
    }
    const map = new THREE.CanvasTexture(canvasEl);
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.RepeatWrapping;
    return map;
  }

  function materialsFor(kind) {
    if (kind === 'lit') {
      const grooves = groovedTexture();
      return {
        steel: new THREE.MeshPhysicalMaterial({ color: 0xb9bfc6, metalness: 1, roughness: 0.32, roughnessMap: grooves, side: THREE.DoubleSide }),
        chrome: new THREE.MeshPhysicalMaterial({ color: 0xdfe3e8, metalness: 1, roughness: 0.12, side: THREE.DoubleSide }),
        dark: new THREE.MeshStandardMaterial({ color: 0x2d3238, metalness: 0.85, roughness: 0.42 }),
        copper: new THREE.MeshStandardMaterial({ color: 0x6e3a20, metalness: 1, roughness: 0.55 }),
        wire: new THREE.MeshStandardMaterial({ color: 0xe8915a, metalness: 1, roughness: 0.22 }),
        glow: new THREE.MeshBasicMaterial({ color: tinted(1.7) }),
        core: new THREE.MeshBasicMaterial({ color: tinted(1.1) }),
        hot: new THREE.MeshBasicMaterial({ color: tinted(3.4, pale) }),
      };
    }
    if (kind === 'shaded') {
      const clay = () => new THREE.MeshStandardMaterial({ color: 0x9aa3ad, metalness: 0.05, roughness: 0.62, side: THREE.DoubleSide });
      const light = (m) => new THREE.MeshBasicMaterial({ color: tinted(m), toneMapped: false });
      return {
        steel: clay(),
        chrome: clay(),
        dark: new THREE.MeshStandardMaterial({ color: 0x4a525a, roughness: 0.7 }),
        copper: clay(),
        wire: clay(),
        glow: light(1),
        core: light(0.8),
        hot: light(1.4),
      };
    }
    const line = (mult, base = hue) => new THREE.MeshBasicMaterial({ color: tinted(mult, base), wireframe: true, toneMapped: false, side: THREE.DoubleSide });
    return {
      steel: line(0.5), chrome: line(0.75), dark: line(0.22), copper: line(0.62), wire: line(0.9),
      glow: line(1), core: line(0.8), hot: line(1, pale),
    };
  }

  function blueprintMaterials() {
    const line = (mult, base = hue) => new THREE.LineBasicMaterial({ color: tinted(mult, base), toneMapped: false });
    return {
      steel: line(0.85), chrome: line(0.95), dark: line(0.3), copper: line(0.7), wire: line(0.6),
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
    hue.setHSL(spec.hue / 360, 0.95, 0.56);
    pale.copy(hue).lerp(new THREE.Color(1, 1, 1), 0.7);
    scanMaterial.color.copy(pale).multiplyScalar(1.4);
    coreLight.color.copy(hue);

    const { parts, outerR } = buildParts(spec);
    const root = new THREE.Group();
    const edges = new Map();
    const reps = ['blueprint', 'wire', 'shaded', 'lit'].map((kind) => {
      const set = kind === 'blueprint' ? blueprintMaterials() : materialsFor(kind);
      const repRoot = new THREE.Group();
      const groups = { body: new THREE.Group(), coils: new THREE.Group(), inner: new THREE.Group() };
      repRoot.add(groups.body, groups.coils, groups.inner);
      parts.forEach((part) => {
        let object;
        if (kind === 'blueprint') {
          if (!edges.has(part.geometry)) edges.set(part.geometry, new THREE.EdgesGeometry(part.geometry, EDGE_ANGLE));
          object = new THREE.LineSegments(edges.get(part.geometry), set[part.role]);
        } else {
          object = new THREE.Mesh(part.geometry, set[part.role]);
        }
        object.position.set(part.x, part.y, part.z);
        object.rotation.z = part.rz;
        groups[part.group].add(object);
      });
      root.add(repRoot);
      return { root: repRoot, coils: groups.coils, inner: groups.inner, materials: Object.values(set) };
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
      const y = -1.15 + 2.3 * scan;
      planeNew.constant = y;
      planeOld.constant = -y;
      scanLine.position.y = y;
      scanMaterial.opacity = Math.sin(Math.PI * Math.min(1, scan));
    }
    const flick = appear < 1 ? (Math.sin(time * 70) > 0.1 - appear ? 1 : 0.3) : 1;
    suit.reps.forEach((rep) => {
      rep.coils.rotation.z += dt * 0.5;
      rep.inner.rotation.z -= dt * 0.8;
    });
    const k = dt ? 1 - Math.exp(-dt * 6) : 1;
    suit.root.rotation.x += (-0.18 + Math.cos(time * 1.15) * 0.1 - state.ty * 0.3 - suit.root.rotation.x) * k;
    suit.root.rotation.y += (0.24 + Math.sin(time * 0.9) * 0.2 + state.tx * 0.45 - suit.root.rotation.y) * k;
    suit.root.position.y = Math.sin(time * 1.3) * 0.016;
    suit.root.scale.setScalar((1 / suit.outerR) * (0.82 + 0.18 * ease));
    const lit = pass === 3 || (scan < 1 && from === 3);
    scene.environmentIntensity = 0.3 * flick;
    key.intensity = 1.1 * flick;
    warm.intensity = 0.6 * flick;
    coreLight.intensity = (lit ? 1.4 : 0.3) * flick * (1 + 0.04 * Math.sin(time * 19.7));
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
