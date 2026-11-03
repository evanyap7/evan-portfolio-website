// The suit stage: one suit at a time, in four render passes, with no canvas of
// its own. The Hall of Armor (hall-scene.js) gives it a canvas of its own; the
// lab stands it in the room. A suit is a scanned film suit loaded from
// models/hall/ (glTF, meshopt-compressed, WebP textures). A suit can wear its
// model's own paint or be repainted: the model's red panels take the suit's
// base colour and its gold panels the accent, so one model can stand in for
// several Marks. Each suit is drawn four times, once per render pass:
// blueprint (edges only) and wireframe from the file's low-poly copy, with
// hidden lines removed, then shaded clay and fully lit from the full mesh.
// Changing pass sweeps a scan line up the suit: below the line is the new
// pass, above it the old one.
//
// A suit is prepared once and kept: its model fetched, its materials made,
// its shaders compiled off the main thread where the browser can, and its
// textures and buffers sent to the GPU in idle moments, so picking it later
// swaps it in at once.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js';

const VIEW = 2.85; // world units across the stage, as the Hall's camera frames it
const SCAN_SECONDS = 0.85;
const SCAN_RANGE = 1.2;
const EDGE_ANGLE = 28;
const FEET = -1.06; // the floor ring's height; every model stands on it
const TALL = 2.08; // a model's height on the stage (the files are 2.0 tall, feet at 0)
export const JARVIS = 196; // the hue of every reactor, eye and blueprint line
const CLAY = 0x9aa3ad;

// Per model: how bright its red and gold panels are on average (linear, the
// brightest channel), so a repaint keeps the texture's shading and wear.
export const MODELS = {
  'mark-1': {},
  'mark-7': { red: 0.052, gold: 0.21 },
  'mark-7-lite': { red: 0.035, gold: 0.149 },
  'mark-50': { red: 0.074, gold: 0.158 },
};

const TEXTURE_SLOTS = ['map', 'normalMap', 'emissiveMap', 'metalnessMap', 'roughnessMap', 'aoMap'];

let loader = null;
const loaded = new Map();

// Fetches a model once. Resolves to { pieces, wire }: the textured meshes, and
// the file's low-poly copy (the node named 'wire') that the blueprint and
// wireframe passes draw, each as { geometry, material, matrix } (the matrix
// carries the file's node transform, which undoes quantisation).
export function loadModel(name) {
  if (!loaded.has(name)) {
    loader ??= new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const url = new URL(`../models/hall/${name}.glb`, import.meta.url).href;
    const request = loader.loadAsync(url).then((gltf) => {
      gltf.scene.updateMatrixWorld(true);
      const pieces = [];
      const wire = [];
      gltf.scene.traverse((node) => {
        if (!node.isMesh) return;
        const piece = { geometry: node.geometry, material: node.material, matrix: node.matrixWorld.clone() };
        (node.name.startsWith('wire') ? wire : pieces).push(piece);
      });
      // A file without its own copy draws the lines from the full mesh.
      if (!wire.length) wire.push(...pieces.map((piece) => ({ ...piece })));
      wire.forEach((piece) => {
        piece.edges = new THREE.EdgesGeometry(piece.geometry, EDGE_ANGLE);
      });
      return { pieces, wire };
    });
    request.catch(() => loaded.delete(name));
    loaded.set(name, request);
  }
  return loaded.get(name);
}

// A badge's image (models/hall/<name>.webp), fetched once.
const badges = new Map();
export function loadBadge(name) {
  if (!badges.has(name)) {
    const url = new URL(`../models/hall/${name}.webp`, import.meta.url).href;
    const request = new THREE.TextureLoader().loadAsync(url).then((texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 4;
      return texture;
    });
    request.catch(() => badges.delete(name));
    badges.set(name, request);
  }
  return badges.get(name);
}

// The badge pressed onto the armour: a ray from the front finds the surface at
// (x, y) in the file's units (feet at 0, 2.0 tall), and a decal follows its
// curve there. Null where the ray misses the suit.
function badgeGeometry(pieces, badge) {
  const meshes = pieces.map((piece) => {
    const mesh = new THREE.Mesh(piece.geometry);
    mesh.matrixAutoUpdate = false;
    mesh.matrix.copy(piece.matrix);
    mesh.matrixWorld.copy(piece.matrix);
    return mesh;
  });
  const ray = new THREE.Raycaster(new THREE.Vector3(badge.x, badge.y, 5), new THREE.Vector3(0, 0, -1));
  const hit = ray.intersectObjects(meshes, false)[0];
  if (!hit) return null;
  const size = new THREE.Vector3(badge.size, badge.size, badge.size);
  return new DecalGeometry(hit.object, hit.point, new THREE.Euler(), size);
}

// Resolves in the browser's next idle moment (or soon, where it has none).
const idle = () => new Promise((resolve) => {
  if ('requestIdleCallback' in window) window.requestIdleCallback(() => resolve(), { timeout: 400 });
  else setTimeout(resolve, 40);
});

// Red panels to `base`, gold panels to `accent`, anything grey, dark or blue
// (the glow) left as it is. Hue decides: gold is red with a lot of green.
const REPAINT = /* glsl */ `
#ifdef USE_MAP
  vec4 sampledDiffuseColor = texture2D( map, vMapUv );
  vec3 paintSrc = sampledDiffuseColor.rgb;
  float paintMax = max( paintSrc.r, max( paintSrc.g, paintSrc.b ) );
  float paintSat = ( paintMax - min( paintSrc.r, min( paintSrc.g, paintSrc.b ) ) ) / max( paintMax, 1e-4 );
  float painted = smoothstep( 0.3, 0.5, paintSat ) * step( paintSrc.b, paintSrc.r );
  float gilt = smoothstep( 0.22, 0.4, paintSrc.g / max( paintSrc.r, 1e-4 ) );
  vec3 redTo = uPaintBase * clamp( paintMax / uPaintRef.x, 0.0, 1.5 );
  vec3 goldTo = uPaintAccent * clamp( paintMax / uPaintRef.y, 0.0, 1.5 );
  paintSrc = mix( paintSrc, mix( redTo, goldTo, gilt ), painted );
  diffuseColor *= vec4( paintSrc, sampledDiffuseColor.a );
#endif
`;

function repainted(source, paint, model) {
  const material = source.clone();
  const base = new THREE.Color(paint.base);
  const accent = new THREE.Color(paint.accent);
  const ref = new THREE.Vector2(model.red, model.gold);
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uPaintBase = { value: base };
    shader.uniforms.uPaintAccent = { value: accent };
    shader.uniforms.uPaintRef = { value: ref };
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', 'uniform vec3 uPaintBase;\nuniform vec3 uPaintAccent;\nuniform vec2 uPaintRef;\nvoid main() {')
      .replace('#include <map_fragment>', REPAINT);
  };
  material.customProgramCacheKey = () => 'hall-repaint';
  if (paint.metal !== undefined) material.metalness = paint.metal;
  if (paint.rough !== undefined) material.roughness = paint.rough;
  return material;
}

// The suit as the lit pass draws it, its badge on: a group at the model's
// scale (TALL), feet at its origin. `make` finishes each new material (the
// stage gives it a clipping plane).
function litFigure(spec, pieces, badgeMap, make = (material) => material) {
  const model = MODELS[spec.model];
  const litFor = new Map();
  const lit = (source) => {
    if (!litFor.has(source)) {
      litFor.set(source, make(spec.paint ? repainted(source, spec.paint, model) : source.clone()));
    }
    return litFor.get(source);
  };
  const figure = new THREE.Group();
  figure.scale.setScalar(TALL / 2);
  pieces.forEach((piece) => {
    const mesh = new THREE.Mesh(piece.geometry, lit(piece.material));
    mesh.matrixAutoUpdate = false;
    mesh.matrix.copy(piece.matrix);
    figure.add(mesh);
  });
  // A badge is worn in the lit pass only, drawn just in front of the armour.
  const badgeShape = badgeMap ? badgeGeometry(pieces, spec.badge) : null;
  if (badgeShape) {
    const badge = new THREE.Mesh(badgeShape, make(new THREE.MeshStandardMaterial({
      map: badgeMap,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
      metalness: 0.2,
      roughness: 0.45,
    })));
    badge.renderOrder = 2;
    figure.add(badge);
  }
  return figure;
}

// The lit suit alone, standing on its feet at y = 0 and TALL (2.08) tall: for
// a suit that only ever stands lit, with no passes, scan line or lights.
export function buildLit(spec, { pieces }, badgeMap) {
  const group = new THREE.Group();
  group.add(litFigure(spec, pieces, badgeMap));
  return group;
}

// The stage. Put `root` and `lights` in one scene, where the suit should stand
// (the stage is VIEW wide around its origin, the suit's feet at y FEET). Call
// step(dt) once per frame drawn, then copy `glow` (0.3 to 1) onto the scene's
// environment intensity and `bloomStrength` onto the bloom, if there is one.
export function createSuitStage(renderer) {
  renderer.localClippingEnabled = true;
  const root = new THREE.Group();
  root.name = 'suit-stage';
  const lights = new THREE.Group();
  lights.name = 'suit-stage-lights';

  // Warming up draws with a camera of the stage's own, framed as the Hall's,
  // looking at the world's origin, where a suit being warmed is put.
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
  camera.position.set(0, 0, VIEW / 2 / Math.tan(THREE.MathUtils.degToRad(14)));

  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  const warm = new THREE.DirectionalLight(0xffd2b0, 0.8);
  warm.position.set(3, -1.5, 3);
  const coreLight = new THREE.PointLight(0xffffff, 2, 3.2, 1.6);
  coreLight.position.set(0, 0.45, 0.5);
  // The targets stand with the lights, so they aim at the stage wherever it is.
  lights.add(key, key.target, warm, warm.target, coreLight);

  // The scan line and the planes that split old pass from new. Every material
  // on stage always has exactly one plane, so one compiled shader serves it
  // settled and mid-sweep: settled, its plane is one that keeps everything.
  // The sweep is set in the stage's own space and carried into the world's.
  const localNew = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
  const localOld = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const planeNew = localNew.clone();
  const planeOld = localOld.clone();
  const planeAll = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1e4);
  const KEEP_ALL = [planeAll];
  const KEEP_NEW = [planeNew];
  const KEEP_OLD = [planeOld];
  const scanMaterial = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, toneMapped: false, clippingPlanes: KEEP_ALL });
  const scanLine = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.012), scanMaterial);
  scanLine.position.z = 0.3;
  scanLine.visible = false;
  root.add(scanLine);

  // Warming up draws into a 1×1 target, so the shaders compile for an
  // offscreen target exactly as a composer's render pass will use them.
  const warmTarget = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
  const primer = new THREE.Scene();
  primer.add(new THREE.Mesh(
    new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(9), 3)),
    new THREE.MeshBasicMaterial({ clippingPlanes: KEEP_ALL }),
  ));
  // Shaders are compiled for the lights and environment of the scene the
  // stage stands in; until it stands in one, a bare scene of its own.
  const bare = new THREE.Scene();
  const sceneOf = () => {
    let node = root;
    while (node.parent) node = node.parent;
    return node.isScene ? node : bare;
  };

  const tinted = (mult, base) => new THREE.Color().copy(base).multiplyScalar(mult);
  const hue = new THREE.Color().setHSL(JARVIS / 360, 0.95, 0.56);
  const pale = new THREE.Color().copy(hue).lerp(new THREE.Color(1, 1, 1), 0.7);
  const glowColor = new THREE.Color().setHSL(JARVIS / 360, 0.9, 0.62);
  scanMaterial.color.copy(pale).multiplyScalar(1.4);
  coreLight.color.copy(glowColor);

  // A ring of light on the floor under the boots, in every pass.
  const ring = new THREE.RingGeometry(0.5, 0.515, 72).rotateX(-Math.PI / 2).translate(0, FEET, 0.02);
  const ringEdges = new THREE.EdgesGeometry(ring);

  // tx, ty: where the pointer hovers. turn: how far the suit has been spun by
  // hand, in radians and unbounded, so it can go all the way round; spin is its
  // speed after a let-go, which fades.
  const state = { tx: 0, ty: 0, turn: 0, spin: 0, held: false };
  const suits = new Map(); // spec → { promise, ready, urgent, suit }
  let suit = null; // on stage: { root, reps: [{ root, materials }], textures }
  let wanted = 0; // the latest setSuit call; older ones that land late are dropped
  let pass = 3;
  let from = 3;
  let scan = 1; // 1 = settled; 0 to 1 = sweeping from `from` to `pass`
  let appear = 1;
  let time = 0;

  // The four representations of one suit, each a group of meshes or lines.
  function build(spec, { pieces, wire: outline }, badgeMap) {
    const make = (material) => {
      material.clippingPlanes = KEEP_ALL;
      return material;
    };
    const line = (mult) => make(new THREE.LineBasicMaterial({ color: tinted(mult, hue), toneMapped: false }));
    const glow = (mult) => make(new THREE.MeshBasicMaterial({ color: tinted(mult, glowColor), toneMapped: false, side: THREE.DoubleSide }));
    // Writes depth only, pushed back a little, so lines behind the suit hide.
    const hider = () => make(new THREE.MeshBasicMaterial({
      colorWrite: false,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    }));

    // The clay takes the suit's colour, so no pass reads as plain white.
    const clayColor = spec.tone !== undefined
      ? new THREE.Color(spec.tone)
      : new THREE.Color(CLAY).lerp(new THREE.Color(spec.paint?.base ?? CLAY), 0.8);
    const clayFor = new Map();
    const clay = (source) => {
      if (!clayFor.has(source)) {
        clayFor.set(source, make(new THREE.MeshStandardMaterial({
          color: clayColor,
          metalness: 0.1,
          roughness: 0.6,
          normalMap: source.normalMap,
          normalScale: source.normalScale,
          emissiveMap: source.emissiveMap,
          emissive: source.emissiveMap ? tinted(1.4, glowColor) : 0x000000,
        })));
      }
      return clayFor.get(source);
    };

    const placed = (object, piece, order = 0) => {
      object.matrixAutoUpdate = false;
      object.matrix.copy(piece.matrix);
      object.renderOrder = order;
      return object;
    };

    const suitRoot = new THREE.Group();
    const reps = ['blueprint', 'wire', 'shaded', 'lit'].map((kind) => {
      const repRoot = new THREE.Group();
      let figure;
      if (kind === 'lit') {
        figure = litFigure(spec, pieces, badgeMap, make);
      } else {
        figure = new THREE.Group();
        figure.scale.setScalar(TALL / 2);
      }
      figure.position.y = FEET;
      if (kind === 'blueprint' || kind === 'wire') {
        const ink = kind === 'blueprint'
          ? line(0.85)
          : make(new THREE.MeshBasicMaterial({ color: tinted(0.75, hue), wireframe: true, toneMapped: false }));
        const hide = hider();
        outline.forEach((piece) => {
          figure.add(placed(new THREE.Mesh(piece.geometry, hide), piece, 0));
          figure.add(placed(kind === 'blueprint' ? new THREE.LineSegments(piece.edges, ink) : new THREE.Mesh(piece.geometry, ink), piece, 1));
        });
      } else if (kind === 'shaded') {
        pieces.forEach((piece) => {
          figure.add(placed(new THREE.Mesh(piece.geometry, clay(piece.material)), piece));
        });
      }
      repRoot.add(figure);
      // Each pass gets its own ring material: the scan line clips old and new apart.
      repRoot.add(kind === 'lit' || kind === 'shaded' ? new THREE.Mesh(ring, glow(1.2)) : new THREE.LineSegments(ringEdges, line(1)));
      suitRoot.add(repRoot);
      const materials = [];
      repRoot.traverse((node) => {
        if (node.material && !materials.includes(node.material)) materials.push(node.material);
      });
      return { root: repRoot, materials };
    });
    const textures = new Set();
    reps.forEach((rep) => rep.materials.forEach((material) => {
      TEXTURE_SLOTS.forEach((slot) => {
        if (material[slot]) textures.add(material[slot]);
      });
    }));
    return { root: suitRoot, reps, textures };
  }

  // Draws `object` once into the 1×1 target with the scene's lights, so its
  // buffers and textures are on the GPU before it is first seen.
  function warmDraw(object) {
    const scene = sceneOf();
    const shown = suit?.root.visible;
    if (suit) suit.root.visible = false;
    scene.add(object);
    renderer.setRenderTarget(warmTarget);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    scene.remove(object);
    if (suit) suit.root.visible = shown;
  }

  // Compiles every shader the suit needs, without blocking where the browser
  // can link programs in parallel. three.js reads the clipping-plane count of
  // the last drawn material when it compiles, so a one-plane primer draws first.
  let scanCompiled = false;
  function compile(next) {
    const scene = sceneOf();
    renderer.setRenderTarget(warmTarget);
    renderer.render(primer, camera);
    const done = [renderer.compileAsync(next.root, camera, scene)];
    if (!scanCompiled) {
      scanCompiled = true;
      done.push(renderer.compileAsync(scanLine, camera, scene));
    }
    renderer.setRenderTarget(null);
    return Promise.all(done);
  }

  // Fetches, builds and warms a suit once. `urgent` skips the idle waits, for
  // a suit the visitor has just picked.
  function prepare(spec, urgent = false) {
    let entry = suits.get(spec);
    if (entry) {
      entry.urgent ||= urgent;
      return entry.promise;
    }
    entry = { urgent, ready: false, suit: null, promise: null };
    const pause = () => (entry.urgent ? Promise.resolve() : idle());
    entry.promise = Promise.all([loadModel(spec.model), spec.badge && loadBadge(spec.badge.name)])
      .then(async ([meshes, badgeMap]) => {
        await pause();
        const next = build(spec, meshes, badgeMap);
        entry.suit = next;
        await compile(next);
        for (const texture of next.textures) {
          if (entry.urgent) break;
          await pause();
          renderer.initTexture(texture);
        }
        if (!entry.urgent) {
          for (const rep of next.reps) {
            await pause();
            if (entry.urgent) break;
            next.reps.forEach((other) => {
              other.root.visible = other === rep;
            });
            warmDraw(next.root);
          }
        }
        entry.ready = true;
        return next;
      });
    entry.promise.catch(() => suits.delete(spec));
    suits.set(spec, entry);
    return entry.promise;
  }

  function show(next, instant) {
    if (suit !== next) {
      if (suit) root.remove(suit.root);
      suit = next;
      root.add(suit.root);
    }
    scan = 1;
    appear = instant ? 1 : 0;
    state.turn = 0;
    state.spin = 0;
    if (!instant) suit.root.rotation.y = 0;
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
      const planes = !sweeping ? KEEP_ALL : isNew ? KEEP_NEW : KEEP_OLD;
      rep.materials.forEach((material) => {
        material.clippingPlanes = planes;
      });
    });
    scanLine.visible = sweeping;
  }

  const stage = {
    root,
    lights,
    state,
    // How far the stage's lights are up, 0.3 to 1, for the scene's environment.
    glow: 1,
    // The bloom the pass on show wants; the Hall's opening value until a suit stands.
    bloomStrength: 0.45,
    // Resolves true once the suit is on stage, false if a later call won.
    setSuit(spec, { instant = false } = {}) {
      wanted += 1;
      const ticket = wanted;
      return prepare(spec, true).then((next) => {
        if (ticket !== wanted) return false;
        show(next, instant);
        return true;
      });
    },
    // `instant` skips the scan line (reduced motion). Returns whether the
    // pass changed.
    setPass(next, { instant = false } = {}) {
      if (next === pass && scan >= 1) return false;
      from = pass;
      pass = next;
      scan = instant ? 1 : 0;
      applyVisibility();
      return true;
    },
    // Spins the suit by hand. `snap` turns it at once as well, for a host that
    // is not stepping the stage. Returns whether a suit is on stage.
    turn(radians, { snap = false } = {}) {
      state.turn += radians;
      if (snap && suit) suit.root.rotation.y += radians;
      return Boolean(suit);
    },
    // Whether a suit would go on stage at once.
    ready(spec) {
      return Boolean(suits.get(spec)?.ready);
    },
    // Fetches and warms a suit in idle moments; resolves when it is ready.
    prepare(spec) {
      return prepare(spec).then(() => true, () => false);
    },
    step(dt) {
      time += dt;
      if (!suit) return;
      // A new suit grows in and its lights come up together, smoothly.
      appear = Math.min(1, appear + dt / 0.6);
      const ease = 1 - (1 - appear) ** 3;
      if (scan < 1) {
        scan = Math.min(1, scan + dt / SCAN_SECONDS);
        if (scan >= 1) applyVisibility();
        const y = -SCAN_RANGE + 2 * SCAN_RANGE * scan;
        localNew.constant = y;
        localOld.constant = -y;
        root.updateWorldMatrix(true, false);
        planeNew.copy(localNew).applyMatrix4(root.matrixWorld);
        planeOld.copy(localOld).applyMatrix4(root.matrixWorld);
        scanLine.position.y = y;
        scanMaterial.opacity = Math.sin(Math.PI * Math.min(1, scan));
      }
      const glow = 0.3 + 0.7 * ease;
      const k = dt ? 1 - Math.exp(-dt * 6) : 1;
      if (!state.held) {
        state.turn += state.spin * dt;
        state.spin *= Math.exp(-dt * 2.5);
        if (Math.abs(state.spin) < 0.01) state.spin = 0;
      }
      suit.root.rotation.x += (0.02 + Math.cos(time * 1.15) * 0.02 - state.ty * 0.12 - suit.root.rotation.x) * k;
      suit.root.rotation.y += (0.2 + Math.sin(time * 0.9) * 0.3 + state.tx * 0.5 + state.turn - suit.root.rotation.y) * k;
      suit.root.position.y = Math.sin(time * 1.3) * 0.016;
      suit.root.scale.setScalar(0.9 + 0.1 * ease);
      const lit = pass === 3 || (scan < 1 && from === 3);
      stage.glow = glow;
      key.intensity = 1.6 * glow;
      warm.intensity = 0.8 * glow;
      coreLight.intensity = (lit ? 0.7 : 0.2) * glow * (1 + 0.04 * Math.sin(time * 19.7));
      stage.bloomStrength = lit ? 0.5 : 0.18;
      key.position.set(-2.2 + state.tx * 3.2, 2.8 - state.ty * 2.4, 4);
    },
  };
  return stage;
}
