// The arc reactor, modelled and lit in three.js: a machined steel housing,
// ten copper coils wound wire by wire, a chrome inner ring with bolts, and a
// glass-domed emitter. Light comes from the core itself (a point light in
// its colour), a studio environment for the metal's reflections, and one
// key light that follows the pointer, so highlights slide across the metal
// as it turns. Bloom makes the hottest parts glow past their edges.
// reactor.js owns the page side (input, the colour cells, the status line)
// and shares one state object with this file.

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const TAU = Math.PI * 2;
const COILS = 10;
const TURNS = 22; // windings per coil
const VIEW = 3.2; // world units across the canvas; the housing is 2 across

function texture(size, draw, color = true) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  draw(canvas.getContext('2d'), size);
  const map = new THREE.CanvasTexture(canvas);
  if (color) map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  return map;
}

// Fine lathe grooves: one random grey per row, used for roughness and bump.
function grooves() {
  const map = texture(256, (g, size) => {
    for (let y = 0; y < size; y += 1) {
      const v = 110 + Math.random() * 100;
      g.fillStyle = `rgb(${v},${v},${v})`;
      g.fillRect(0, y, size, 1);
    }
  }, false);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(1, 3);
  return map;
}

// The emitter's face, in greys: a white-hot centre, rings and segments.
// Its material colour (the reactor's hue, far brighter than 1) tints it.
function lensFace() {
  return texture(512, (g, size) => {
    const c = size / 2;
    const glow = g.createRadialGradient(c, c, 0, c, c, c);
    glow.addColorStop(0, '#fff');
    glow.addColorStop(0.22, '#fff');
    glow.addColorStop(0.5, '#a4a4a4');
    glow.addColorStop(0.85, '#5c5c5c');
    glow.addColorStop(1, '#303030');
    g.fillStyle = glow;
    g.fillRect(0, 0, size, size);
    g.strokeStyle = 'rgba(0,0,0,0.55)';
    [0.3, 0.46, 0.62, 0.78, 0.93].forEach((r, i) => {
      g.lineWidth = i % 2 ? 3 : 7;
      g.beginPath();
      g.arc(c, c, r * c, 0, TAU);
      g.stroke();
    });
    g.lineWidth = 5;
    for (let i = 0; i < 20; i += 1) {
      const a = (i / 20) * TAU;
      g.beginPath();
      g.moveTo(c + Math.cos(a) * 0.63 * c, c + Math.sin(a) * 0.63 * c);
      g.lineTo(c + Math.cos(a) * 0.92 * c, c + Math.sin(a) * 0.92 * c);
      g.stroke();
    }
  });
}

function halo() {
  return texture(256, (g, size) => {
    const c = size / 2;
    const glow = g.createRadialGradient(c, c, 0, c, c, c);
    glow.addColorStop(0, 'rgba(255,255,255,1)');
    glow.addColorStop(0.35, 'rgba(255,255,255,0.35)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = glow;
    g.fillRect(0, 0, size, size);
  });
}

// A profile of [radius, z] points, turned into a ring facing the camera.
function lathe(points, segments = 160) {
  const geometry = new THREE.LatheGeometry(points.map(([r, z]) => new THREE.Vector2(r, z)), segments);
  geometry.rotateX(Math.PI / 2);
  return geometry;
}

// A slab shaped like a slice of a ring, centred on z = 0.
function sector(r0, r1, a0, a1, depth) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, r1, a0, a1, false);
  shape.absarc(0, 0, r0, a1, a0, true);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth, curveSegments: 24, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.006, bevelSegments: 2,
  });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

// One turn of wire: a rounded rectangle around the coil's cross-section,
// in the plane through the reactor's axis.
function turn() {
  const points = [];
  const n = 8;
  for (let i = 0; i < 72; i += 1) {
    const t = (i / 72) * TAU;
    const c = Math.cos(t);
    const s = Math.sin(t);
    points.push(new THREE.Vector3(
      0.67 + 0.152 * Math.sign(c) * Math.abs(c) ** (2 / n),
      0,
      0.082 * Math.sign(s) * Math.abs(s) ** (2 / n),
    ));
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, true), 96, 0.0047, 6, true);
}

export function createReactor(canvas, state) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  // Touch screens are mostly phones: 1.5x is sharp enough there and keeps
  // the frame rate up.
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2));

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.22;

  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
  camera.position.set(0, 0, VIEW / 2 / Math.tan(THREE.MathUtils.degToRad(14)));

  const reactor = new THREE.Group();
  scene.add(reactor);

  // Materials ---------------------------------------------------------
  const lines = grooves();
  const steel = new THREE.MeshPhysicalMaterial({
    color: 0xb9bfc6, metalness: 1, roughness: 0.3, roughnessMap: lines, bumpMap: lines, bumpScale: 0.4,
    anisotropy: 0.5, side: THREE.DoubleSide,
  });
  const chrome = new THREE.MeshPhysicalMaterial({
    color: 0xdfe3e8, metalness: 1, roughness: 0.12, roughnessMap: lines, side: THREE.DoubleSide,
  });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2d3238, metalness: 0.85, roughness: 0.42 });
  const copper = new THREE.MeshStandardMaterial({ color: 0xe8915a, metalness: 1, roughness: 0.22 });
  const copperCore = new THREE.MeshStandardMaterial({ color: 0x6e3a20, metalness: 1, roughness: 0.55 });
  const plateSteel = new THREE.MeshStandardMaterial({ color: 0x8d949c, metalness: 1, roughness: 0.38, roughnessMap: lines });
  // The glowing parts: plain colour, scaled far past 1 so they bloom.
  const bed = new THREE.MeshBasicMaterial();
  const band = new THREE.MeshBasicMaterial();
  const lens = new THREE.MeshBasicMaterial({ map: lensFace() });
  const hot = new THREE.MeshBasicMaterial();
  const aura = new THREE.MeshBasicMaterial({
    map: halo(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });

  // Housing -----------------------------------------------------------
  reactor.add(new THREE.Mesh(lathe([
    [0.83, -0.13], [0.845, -0.02], [0.87, 0.006], [0.9, 0.01], [0.908, 0.07], [0.93, 0.096],
    [0.972, 0.096], [0.995, 0.076], [1.0, 0.04], [1.0, -0.15], [0.984, -0.18], [0.8, -0.18],
  ]), steel));
  const floor = new THREE.Mesh(new THREE.CircleGeometry(0.85, 96), dark);
  floor.position.z = -0.13;
  reactor.add(floor);

  // The bed of light under the coils, seen through the gaps between them.
  const lightBed = new THREE.Mesh(new THREE.RingGeometry(0.47, 0.84, 128), bed);
  lightBed.position.z = -0.11;
  reactor.add(lightBed);

  // Screws around the rim.
  const screw = new THREE.CylinderGeometry(0.016, 0.016, 0.012, 24).rotateX(Math.PI / 2);
  const slot = new THREE.BoxGeometry(0.026, 0.0045, 0.006);
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * TAU + TAU / 16;
    const head = new THREE.Mesh(screw, chrome);
    head.position.set(Math.cos(a) * 0.951, Math.sin(a) * 0.951, 0.1);
    const cut = new THREE.Mesh(slot, dark);
    cut.position.set(head.position.x, head.position.y, 0.106);
    cut.rotation.z = a + 0.6;
    reactor.add(head, cut);
  }

  // Coils -------------------------------------------------------------
  const coils = new THREE.Group();
  reactor.add(coils);
  const span = (TAU / COILS) * 0.74; // each coil's share of its slice; the rest is gap
  const plate = sector(0.5, 0.845, -0.019, 0.019, 0.2);
  const core = sector(0.525, 0.812, -span / 2 + 0.03, span / 2 - 0.03, 0.15);
  const wire = new THREE.InstancedMesh(turn(), copper, COILS * TURNS);
  const place = new THREE.Matrix4();
  const tint = new THREE.Color();
  for (let c = 0; c < COILS; c += 1) {
    const mid = (c / COILS) * TAU;
    const block = new THREE.Mesh(core, copperCore);
    block.rotation.z = mid;
    coils.add(block);
    [-1, 1].forEach((side) => {
      const end = new THREE.Mesh(plate, plateSteel);
      end.rotation.z = mid + side * (span / 2 + 0.008);
      coils.add(end);
    });
    for (let t = 0; t < TURNS; t += 1) {
      const a = mid - span / 2 + 0.04 + (t / (TURNS - 1)) * (span - 0.08);
      place.makeRotationZ(a);
      wire.setMatrixAt(c * TURNS + t, place);
      wire.setColorAt(c * TURNS + t, tint.setHSL(0.06 + Math.random() * 0.012, 0.6, 0.55 + Math.random() * 0.12));
    }
  }
  coils.add(wire);

  // Inner ring and emitter ---------------------------------------------
  const inner = new THREE.Group();
  reactor.add(inner);
  inner.add(new THREE.Mesh(lathe([
    [0.36, -0.07], [0.36, 0.07], [0.374, 0.098], [0.468, 0.098], [0.488, 0.078], [0.494, -0.07],
  ]), chrome));
  const bolt = new THREE.CylinderGeometry(0.017, 0.019, 0.022, 6).rotateX(Math.PI / 2);
  for (let i = 0; i < 10; i += 1) {
    const a = (i / 10) * TAU + TAU / 20;
    const head = new THREE.Mesh(bolt, steel);
    head.position.set(Math.cos(a) * 0.422, Math.sin(a) * 0.422, 0.108);
    head.rotation.z = a;
    inner.add(head);
  }
  // One lit marker on each turning part: the reactor looks the same every
  // 36 degrees, so without them a slow turn cannot be seen.
  const dot = new THREE.CircleGeometry(0.03, 32);
  const ringMark = new THREE.Mesh(dot, hot);
  ringMark.position.set(0, 0.43, 0.102);
  inner.add(ringMark);
  const coilMark = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.02), hot);
  coilMark.position.set(0, 0.66, 0.1);
  coils.add(coilMark);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.285, 0.36, 128), band);
  ring.position.z = 0.055;
  reactor.add(ring);
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.287, 128), lens);
  face.position.z = 0.06;
  reactor.add(face);
  const spot = new THREE.Mesh(new THREE.CircleGeometry(0.075, 64), hot);
  spot.position.z = 0.064;
  reactor.add(spot);
  // A low glass dome over the emitter, for the glint that crosses it.
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 96, 24, 0, TAU, 0, 0.76).rotateX(Math.PI / 2),
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff, metalness: 0, roughness: 0.14, transmission: 1, thickness: 0.12, ior: 1.45,
      clearcoat: 1, clearcoatRoughness: 0.18,
    }),
  );
  dome.position.z = 0.062 - 0.42 * Math.cos(0.76);
  reactor.add(dome);

  const back = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4), aura);
  back.position.z = -0.4;
  scene.add(back);

  // Lights --------------------------------------------------------------
  const coreLight = new THREE.PointLight(0xffffff, 3, 3.2, 1.6);
  coreLight.position.set(0, 0, 0.32);
  reactor.add(coreLight);
  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  const warm = new THREE.DirectionalLight(0xffd2b0, 0.7);
  warm.position.set(3, -1.5, 3);
  scene.add(key, warm);

  // Post: bloom on the HDR scene, then tone mapping and sRGB. --------------
  const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.45, 0.4, 0.95);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // Frame ---------------------------------------------------------------
  const hue = new THREE.Color();
  const white = new THREE.Color(1, 1, 1);
  const mix = new THREE.Color();
  let boot = 0; // 0 to 1 over the first moments: the reactor powering on
  let frame = 0;
  let last = 0;
  let time = 0;

  function step(dt) {
    time += dt;
    const s = state;
    // Charge builds over 1.4 s while held and drains fast once let go.
    s.power = s.charging ? Math.min(1, s.power + dt / 1.4) : Math.max(0, s.power - dt * 2.2);
    s.pulse = Math.max(0, s.pulse - dt * 1.6);
    // Asleep (behind the gate) it is dark but for a faint ember; once woken
    // it powers on: a few hard flickers, then steady with a faint shimmer.
    boot = s.awake ? Math.min(1, boot + dt / 1.6) : 0;
    const flick = !s.awake ? 0.05 + 0.02 * Math.sin(time * 1.4)
      : boot < 1 ? (Math.sin(time * 61) > 0.2 - boot ? 1 : 0.25) * (0.35 + 0.65 * boot) : 1;
    scene.environmentIntensity = 0.07 + 0.15 * boot;
    key.intensity = 0.35 + 0.75 * boot;
    warm.intensity = 0.2 + 0.5 * boot;
    const shimmer = 1 + 0.035 * Math.sin(time * 19.7) * Math.sin(time * 5.3)
      + 0.28 * Math.max(0, Math.sin(time * 1.6)) ** 3; // a slow heartbeat
    const level = flick * shimmer * (1 + s.power * 0.8 + s.pulse * 1.3);

    bed.color.copy(hue).multiplyScalar(1.7 * level);
    band.color.copy(hue).multiplyScalar(2 * level);
    lens.color.copy(hue).multiplyScalar(0.75 * level);
    hot.color.copy(mix.copy(hue).lerp(white, 0.7)).multiplyScalar(3.4 * level);
    aura.color.copy(hue).multiplyScalar(0.16 * level);
    coreLight.color.copy(hue);
    coreLight.intensity = 0.9 * level;
    bloom.strength = 0.45 + s.power * 0.4 + s.pulse * 0.7;

    // The coils turn slowly and spin up with charge; the inner ring counters.
    coils.rotation.z += dt * (0.55 * boot + s.power * 3.2) + s.spin;
    inner.rotation.z -= dt * (0.9 * boot + s.power * 1.4);
    s.spin *= Math.exp(-dt * 3);

    // At rest it is turned a little, so the housing shows its depth; it
    // faces the pointer, plus however far it has been dragged.
    // It also drifts on its own, so it is alive with no pointer at all
    // (phones, keyboards): a slow sway and a gentle float.
    const sway = Math.sin(time * 0.9) * (0.25 + 0.75 * boot);
    const bob = Math.cos(time * 1.15) * (0.25 + 0.75 * boot);
    const ease = dt ? 1 - Math.exp(-dt * 6) : 1;
    reactor.rotation.x += (-0.2 + bob * 0.24 - s.ty * 0.32 + s.dragY - reactor.rotation.x) * ease;
    reactor.rotation.y += (0.26 + sway * 0.42 + s.tx * 0.42 + s.dragX - reactor.rotation.y) * ease;
    const shake = s.power > 0.85 ? (s.power - 0.85) * 0.06 : 0;
    reactor.position.set((Math.random() - 0.5) * shake, Math.sin(time * 1.3) * 0.018 + (Math.random() - 0.5) * shake, 0);
    key.position.set(-2.2 + s.tx * 3.2, 2.8 - s.ty * 2.4, 4);
  }

  function loop(now) {
    frame = requestAnimationFrame(loop);
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0);
    last = now;
    step(dt);
    state.onTick?.();
    composer.render();
  }

  // Redraws once when nothing is looping (reduced motion, or off screen).
  const still = () => {
    if (frame) return;
    step(0);
    composer.render();
  };

  return {
    setHue(degrees) {
      hue.setHSL(degrees / 360, 0.95, 0.56);
      still();
    },
    setBackground(css) {
      renderer.setClearColor(new THREE.Color().setStyle(css));
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
    // At once, with no flicker (reduced motion): dark while asleep, fully
    // powered once awake.
    poweredOn() {
      boot = state.awake ? 1 : 0;
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
